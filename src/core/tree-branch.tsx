import React, {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { TreeItem } from "../primitives/types.ts";
import { type BranchHandlers, TreeRootContext } from "./tree-root-context.tsx";

export type TreeBranchContextValue = {
	parentId: string | null;
	items: TreeItem[];
	isLoading: boolean;
	setItems: React.Dispatch<React.SetStateAction<TreeItem[]>>;
	toggleItem: (itemId: string) => void;
	expandItem: (itemId: string) => void;
	collapseItem: (itemId: string) => void;
};

export const TreeBranchContext = createContext<TreeBranchContextValue | null>(
	null,
);

export type TreeBranchProps = {
	id: string | null; // null = root
	initialChildren?: TreeItem[];
	loadChildren?: (id: string | null) => Promise<TreeItem[]>;
	onMoveItem?: (
		itemId: string,
		targetBranchId: string | null,
		targetIndex: number,
	) => Promise<TreeItem[]>;
	children: (items: TreeItem[], isLoading: boolean) => ReactNode;
};

export function TreeBranch({
	id,
	initialChildren,
	loadChildren,
	onMoveItem,
	children,
}: TreeBranchProps) {
	const rootContext = useContext(TreeRootContext);

	// Resolve initial items. Priority:
	// 1. Explicit prop
	// 2. Live registry (old branch still registered during same-commit remount)
	// 3. Saved state (branch unmounted in a previous commit, e.g. collapse/expand)
	// 4. Initial data from flattenTreeData
	const [items, setItems] = useState<TreeItem[]>(
		() =>
			initialChildren ??
			rootContext?.getBranchItems(id) ??
			rootContext?.consumeSavedBranchState(id) ??
			rootContext?.getInitialBranchItems(id) ??
			[],
	);
	const [isLoading, setIsLoading] = useState(false);
	const hasLoadedRef = useRef(false);
	const itemsRef = useRef(items);

	// Keep ref in sync
	useEffect(() => {
		itemsRef.current = items;
	}, [items]);

	// Stable ref for onMoveItem so event listeners don't re-subscribe
	const onMoveItemRef = useRef(onMoveItem);
	useEffect(() => {
		onMoveItemRef.current = onMoveItem;
	}, [onMoveItem]);

	// Prevents loadChildren from overwriting move results
	const moveInProgressRef = useRef(false);

	// Fire onMoveItem in the background and reconcile with the server response.
	// The caller is responsible for doing the optimistic local update first.
	const reconcileMove = useCallback(
		(itemId: string, targetIndex: number) => {
			if (!onMoveItemRef.current) return;
			moveInProgressRef.current = true;
			onMoveItemRef
				.current(itemId, id, targetIndex)
				.then((result) => {
					setItems(result);
				})
				.catch(console.error)
				.finally(() => {
					moveInProgressRef.current = false;
				});
		},
		[id],
	);

	// Notify when branch transitions between empty and non-empty
	const prevItemCountRef = useRef(items.length);
	useEffect(() => {
		const prev = prevItemCountRef.current;
		prevItemCountRef.current = items.length;

		if (rootContext && id !== null) {
			if (prev > 0 && items.length === 0) {
				rootContext.dispatchEvent({
					type: "branch-children-changed",
					payload: { branchId: id, hasChildren: false },
				});
			} else if (prev === 0 && items.length > 0) {
				rootContext.dispatchEvent({
					type: "branch-children-changed",
					payload: { branchId: id, hasChildren: true },
				});
			}
		}
	}, [items.length, id, rootContext]);

	// Load children on mount (if this is root) or when needed
	useEffect(() => {
		if (
			loadChildren &&
			!hasLoadedRef.current &&
			itemsRef.current.length === 0
		) {
			hasLoadedRef.current = true;
			setIsLoading(true);
			loadChildren(id)
				.then((loaded) => {
					if (moveInProgressRef.current) return;
					setItems((prev) => {
						// Merge: loaded children first, then any items already
						// present (e.g. from a drop that arrived before loading finished)
						const existingIds = new Set(prev.map((i) => i.id));
						const newItems = loaded.filter((i) => !existingIds.has(i.id));
						return [...newItems, ...prev];
					});
				})
				.catch(console.error)
				.finally(() => {
					if (!moveInProgressRef.current) setIsLoading(false);
				});
		}
	}, [id, loadChildren]);

	// Toggle item open/closed state
	const toggleItem = useCallback((itemId: string) => {
		setItems((prevItems) =>
			prevItems.map((item) =>
				item.id === itemId ? { ...item, isOpen: !item.isOpen } : item,
			),
		);
	}, []);

	// Expand an item
	const expandItem = useCallback((itemId: string) => {
		setItems((prevItems) =>
			prevItems.map((item) =>
				item.id === itemId && !item.isOpen ? { ...item, isOpen: true } : item,
			),
		);
	}, []);

	// Collapse an item
	const collapseItem = useCallback((itemId: string) => {
		setItems((prevItems) =>
			prevItems.map((item) =>
				item.id === itemId && item.isOpen ? { ...item, isOpen: false } : item,
			),
		);
	}, []);

	// Local state operations for event-driven moves
	const addItemLocal = useCallback((item: TreeItem, index: number) => {
		setItems((prev) => {
			const newItems = [...prev];
			const clampedIndex = Math.min(index, newItems.length);
			newItems.splice(clampedIndex, 0, item);
			return newItems;
		});
	}, []);

	const removeItemLocal = useCallback(
		(itemId: string): TreeItem | undefined => {
			const item = itemsRef.current.find((i) => i.id === itemId);
			if (!item) return undefined;

			setItems((prev) => prev.filter((i) => i.id !== itemId));
			return item;
		},
		[],
	);

	const reorderItemLocal = useCallback((itemId: string, toIndex: number) => {
		setItems((prev) => {
			const fromIndex = prev.findIndex((i) => i.id === itemId);
			if (fromIndex === -1) return prev;

			const newItems = [...prev];
			const removed = newItems.splice(fromIndex, 1);
			if (!removed[0]) return prev;
			// Adjust toIndex since we removed an item before it
			const adjustedIndex = toIndex > fromIndex ? toIndex - 1 : toIndex;
			newItems.splice(adjustedIndex, 0, removed[0]);
			return newItems;
		});
	}, []);

	// Register with root context (read-only handlers)
	useEffect(() => {
		if (!rootContext) return;

		const handlers: BranchHandlers = {
			getItems: () => itemsRef.current,
			containsItem: (itemId: string) =>
				itemsRef.current.some((i) => i.id === itemId),
		};

		return rootContext.registerBranch(id, handlers);
	}, [rootContext, id]);

	// Listen for drop events + consume any pending items from before this branch mounted
	useEffect(() => {
		if (!rootContext) return;

		// Items queued from drops that targeted this branch before it mounted.
		// Skip items already present (listener may have handled them).
		const pending = rootContext.consumePendingItems(id);
		for (const { item, index } of pending) {
			if (!itemsRef.current.some((i) => i.id === item.id)) {
				addItemLocal(item, index);
				rootContext.dispatchEvent({
					type: "item-added",
					payload: { branchId: id, itemId: item.id },
				});
				reconcileMove(item.id, index);
			}
		}

		return rootContext.addEventListener((event) => {
			if (event.type === "item-drop-requested") {
				const { item, sourceBranchId, targetBranchId, targetIndex } =
					event.payload;

				// Same branch reorder
				if (sourceBranchId === id && targetBranchId === id) {
					reorderItemLocal(item.id, targetIndex);
					reconcileMove(item.id, targetIndex);
					return;
				}

				// Am I the source? Remove the item optimistically.
				if (sourceBranchId === id) {
					removeItemLocal(item.id);
				}

				// Am I the target? Add optimistically, then reconcile with server.
				if (targetBranchId === id) {
					addItemLocal(item, targetIndex);
					rootContext.consumePendingItems(id);
					rootContext.dispatchEvent({
						type: "item-added",
						payload: { branchId: id, itemId: item.id },
					});
					reconcileMove(item.id, targetIndex);
				}
			}
		});
	}, [
		rootContext,
		id,
		addItemLocal,
		removeItemLocal,
		reorderItemLocal,
		reconcileMove,
	]);

	const contextValue = useMemo<TreeBranchContextValue>(
		() => ({
			parentId: id,
			items,
			isLoading,
			setItems,
			toggleItem,
			expandItem,
			collapseItem,
		}),
		[id, items, isLoading, toggleItem, expandItem, collapseItem],
	);

	return (
		<TreeBranchContext.Provider value={contextValue}>
			{children(items, isLoading)}
		</TreeBranchContext.Provider>
	);
}

export function useTreeBranch() {
	const context = useContext(TreeBranchContext);
	if (!context) {
		throw new Error("useTreeBranch must be used within a TreeBranch");
	}
	return context;
}
