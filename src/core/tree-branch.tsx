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
import type {
	MoveItemArgs,
	MoveItemResult,
	TreeItem,
} from "../primitives/types.ts";
import { type BranchHandlers, TreeRootContext } from "./tree-root-context.tsx";

export type TreeBranchContextValue = {
	parentId: string | null;
	items: TreeItem[];
	isLoading: boolean;
	setItems: React.Dispatch<React.SetStateAction<TreeItem[]>>;
	createItem: (item: TreeItem) => void;
	createFolder: (folder: TreeItem) => void;
	deleteItem: (itemId: string) => void;
	deleteFolder: (folderId: string) => void;
};

export const TreeBranchContext = createContext<TreeBranchContextValue | null>(
	null,
);

export type TreeBranchProps = {
	id: string | null; // null = root
	initialChildren?: TreeItem[];
	loadChildren?: (id: string | null) => Promise<TreeItem[]>;
	onMoveItem?: (args: MoveItemArgs) => Promise<MoveItemResult>;
	onCreateItem?: (
		parentBranchId: string | null,
		item: TreeItem,
	) => Promise<TreeItem[]>;
	onCreateFolder?: (
		parentBranchId: string | null,
		folder: TreeItem,
	) => Promise<TreeItem[]>;
	onDeleteItem?: (
		itemId: string,
		branchId: string | null,
	) => Promise<TreeItem[]>;
	onDeleteFolder?: (
		folderId: string,
		branchId: string | null,
	) => Promise<TreeItem[]>;
	children: (items: TreeItem[], isLoading: boolean) => ReactNode;
};

export function TreeBranch({
	id,
	initialChildren,
	loadChildren,
	onMoveItem,
	onCreateItem,
	onCreateFolder,
	onDeleteItem,
	onDeleteFolder,
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

	// Stable refs for callbacks so event listeners don't re-subscribe
	const onMoveItemRef = useRef(onMoveItem);
	useEffect(() => {
		onMoveItemRef.current = onMoveItem;
	}, [onMoveItem]);

	const onCreateItemRef = useRef(onCreateItem);
	useEffect(() => {
		onCreateItemRef.current = onCreateItem;
	}, [onCreateItem]);

	const onCreateFolderRef = useRef(onCreateFolder);
	useEffect(() => {
		onCreateFolderRef.current = onCreateFolder;
	}, [onCreateFolder]);

	const onDeleteItemRef = useRef(onDeleteItem);
	useEffect(() => {
		onDeleteItemRef.current = onDeleteItem;
	}, [onDeleteItem]);

	const onDeleteFolderRef = useRef(onDeleteFolder);
	useEffect(() => {
		onDeleteFolderRef.current = onDeleteFolder;
	}, [onDeleteFolder]);

	// Prevents loadChildren from overwriting move results
	const moveInProgressRef = useRef(false);

	// Fire onMoveItem in the background and reconcile with the server response.
	// Called by the TARGET branch after optimistic updates are applied.
	// On success: sets target items from result, dispatches branch-reconcile to source.
	// On failure: rolls back both branches from pre-drop snapshots.
	const reconcileMove = useCallback(
		(args: MoveItemArgs) => {
			if (!onMoveItemRef.current || !rootContext) return;
			moveInProgressRef.current = true;
			console.log("[reconcileMove] start", { branchId: id, args });
			onMoveItemRef
				.current(args)
				.then((result) => {
					console.log("[reconcileMove] success", {
						branchId: id,
						sourceItems: result.sourceBranchItems.map((i) => i.id),
						targetItems: result.targetBranchItems.map((i) => i.id),
					});
					// Reconcile target branch (this branch) with server
					setItems(result.targetBranchItems);
					// Reconcile source branch via event (if cross-branch)
					if (args.sourceBranchId !== args.targetBranchId) {
						rootContext.dispatchEvent({
							type: "branch-reconcile",
							payload: {
								branchId: args.sourceBranchId,
								items: result.sourceBranchItems,
							},
						});
					}
					// Consume snapshots (no longer needed)
					rootContext.consumePreDropSnapshot(args.targetBranchId);
					if (args.sourceBranchId !== args.targetBranchId) {
						rootContext.consumePreDropSnapshot(args.sourceBranchId);
					}
				})
				.catch((err) => {
					console.error(err);
					// Roll back target branch from snapshot
					const targetSnapshot = rootContext.consumePreDropSnapshot(
						args.targetBranchId,
					);
					if (targetSnapshot) setItems(targetSnapshot);
					// Roll back source branch via event (if cross-branch)
					if (args.sourceBranchId !== args.targetBranchId) {
						const sourceSnapshot = rootContext.consumePreDropSnapshot(
							args.sourceBranchId,
						);
						if (sourceSnapshot) {
							rootContext.dispatchEvent({
								type: "branch-reconcile",
								payload: {
									branchId: args.sourceBranchId,
									items: sourceSnapshot,
								},
							});
						}
					}
				})
				.finally(() => {
					moveInProgressRef.current = false;
				});
		},
		[rootContext, id],
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
					console.log("[loadChildren resolved]", {
						branchId: id,
						moveInProgress: moveInProgressRef.current,
						loaded: loaded.map((i) => i.id),
					});
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

	// Create/delete operations with optimistic updates and rollback
	const createItem = useCallback(
		(item: TreeItem) => {
			const snapshot = [...itemsRef.current];
			setItems((prev) => [...prev, item]);
			rootContext?.dispatchEvent({
				type: "item-created",
				payload: { branchId: id, item },
			});
			if (onCreateItemRef.current) {
				onCreateItemRef.current(id, item).then(
					(result) => setItems(result),
					() => setItems(snapshot),
				);
			}
		},
		[id, rootContext],
	);

	const createFolder = useCallback(
		(folder: TreeItem) => {
			const snapshot = [...itemsRef.current];
			setItems((prev) => [...prev, folder]);
			rootContext?.dispatchEvent({
				type: "folder-created",
				payload: { branchId: id, folder },
			});
			if (onCreateFolderRef.current) {
				onCreateFolderRef.current(id, folder).then(
					(result) => setItems(result),
					() => setItems(snapshot),
				);
			}
		},
		[id, rootContext],
	);

	const deleteItem = useCallback(
		(itemId: string) => {
			const snapshot = [...itemsRef.current];
			setItems((prev) => prev.filter((i) => i.id !== itemId));
			rootContext?.dispatchEvent({
				type: "item-deleted",
				payload: { branchId: id, itemId },
			});
			if (onDeleteItemRef.current) {
				onDeleteItemRef.current(itemId, id).then(
					(result) => setItems(result),
					() => setItems(snapshot),
				);
			}
		},
		[id, rootContext],
	);

	const deleteFolder = useCallback(
		(folderId: string) => {
			const snapshot = [...itemsRef.current];
			setItems((prev) => prev.filter((i) => i.id !== folderId));
			rootContext?.dispatchEvent({
				type: "folder-deleted",
				payload: { branchId: id, folderId },
			});
			if (onDeleteFolderRef.current) {
				onDeleteFolderRef.current(folderId, id).then(
					(result) => setItems(result),
					() => setItems(snapshot),
				);
			}
		},
		[id, rootContext],
	);

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
		console.log("[branch mount]", {
			branchId: id,
			pendingCount: pending.length,
			currentItems: itemsRef.current.map((i) => i.id),
		});
		for (const { item, index, sourceBranchId } of pending) {
			if (!itemsRef.current.some((i) => i.id === item.id)) {
				console.log("[pending consume]", {
					branchId: id,
					item: item.id,
					index,
					sourceBranchId,
				});
				rootContext.savePreDropSnapshot(id, [...itemsRef.current]);
				addItemLocal(item, index);
				rootContext.dispatchEvent({
					type: "item-added",
					payload: { branchId: id, itemId: item.id },
				});
				reconcileMove({
					itemId: item.id,
					sourceBranchId,
					targetBranchId: id,
					targetIndex: index,
				});
			}
		}

		return rootContext.addEventListener((event) => {
			if (event.type === "item-drop-requested") {
				const { itemId, item, sourceBranchId, targetBranchId, targetIndex } =
					event.payload;

				const moveArgs: MoveItemArgs = {
					itemId,
					sourceBranchId,
					targetBranchId,
					targetIndex,
				};

				// Same branch reorder
				if (sourceBranchId === id && targetBranchId === id) {
					rootContext.savePreDropSnapshot(id, [...itemsRef.current]);
					reorderItemLocal(item.id, targetIndex);
					reconcileMove(moveArgs);
					return;
				}

				// Am I the source? Snapshot then remove the item optimistically.
				if (sourceBranchId === id) {
					rootContext.savePreDropSnapshot(id, [...itemsRef.current]);
					removeItemLocal(item.id);
				}

				// Am I the target? Snapshot, add optimistically, then reconcile with server.
				if (targetBranchId === id) {
					rootContext.savePreDropSnapshot(id, [...itemsRef.current]);
					addItemLocal(item, targetIndex);
					rootContext.consumePendingItems(id);
					rootContext.dispatchEvent({
						type: "item-added",
						payload: { branchId: id, itemId: item.id },
					});
					reconcileMove(moveArgs);
				}
			}

			// Handle branch reconciliation (dispatched by target after server response)
			if (event.type === "branch-reconcile" && event.payload.branchId === id) {
				console.log("[branch-reconcile]", {
					branchId: id,
					items: event.payload.items.map((i) => i.id),
				});
				setItems(event.payload.items);
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
			createItem,
			createFolder,
			deleteItem,
			deleteFolder,
		}),
		[id, items, isLoading, createItem, createFolder, deleteItem, deleteFolder],
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
