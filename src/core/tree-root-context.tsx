import React, {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	type ReactNode,
} from 'react';
import type { TreeItem } from '../primitives/types.ts';
import type { Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';

export type DropPayload = {
	itemId: string;
	item: TreeItem;
	sourceBranchId: string | null;
	targetBranchId: string | null;
	targetIndex: number;
	instruction: Instruction;
};

export type TreeEventType =
	| { type: 'item-drop-requested'; payload: DropPayload }
	| { type: 'item-added'; payload: { branchId: string | null; itemId: string } }
	| { type: 'branch-children-changed'; payload: { branchId: string; hasChildren: boolean } };

export type TreeEventListener = (event: TreeEventType) => void;

export type BranchHandlers = {
	getItems: () => TreeItem[];
	containsItem: (itemId: string) => boolean;
};

export type PendingItem = { item: TreeItem; index: number };

export type TreeRootContextValue = {
	uniqueContextId: symbol;
	registerBranch: (id: string | null, handlers: BranchHandlers) => () => void;
	findItemBranch: (itemId: string) => string | null | undefined;
	getItem: (itemId: string) => TreeItem | undefined;
	getPathToItem: (itemId: string) => string[];
	itemHasChildren: (itemId: string) => boolean;
	getInitialBranchItems: (branchId: string | null) => TreeItem[] | undefined;
	addEventListener: (listener: TreeEventListener) => () => void;
	dispatchEvent: (event: TreeEventType) => void;
	consumePendingItems: (branchId: string | null) => PendingItem[];
	getBranchItems: (branchId: string | null) => TreeItem[] | undefined;
	consumeSavedBranchState: (branchId: string | null) => TreeItem[] | undefined;
};

export const TreeRootContext = createContext<TreeRootContextValue | null>(null);

export type TreeRootProviderProps = {
	initialBranchData?: Map<string | null, TreeItem[]>;
	children: ReactNode;
};

export function TreeRootProvider({ initialBranchData, children }: TreeRootProviderProps) {
	const branchRegistry = useRef(new Map<string | null, BranchHandlers>());
	const listenersRef = useRef<Set<TreeEventListener>>(new Set());
	const pendingItemsRef = useRef(new Map<string | null, PendingItem[]>());
	const savedBranchStateRef = useRef(new Map<string | null, TreeItem[]>());
	const initialBranchDataRef = useRef(initialBranchData ?? new Map<string | null, TreeItem[]>());
	const uniqueContextId = useMemo(() => Symbol('tree-context'), []);

	const registerBranch = useCallback((id: string | null, handlers: BranchHandlers) => {
		branchRegistry.current.set(id, handlers);
		return () => {
			// Snapshot items before unregistering so state survives remount
			savedBranchStateRef.current.set(id, handlers.getItems());
			branchRegistry.current.delete(id);
		};
	}, []);

	const addEventListener = useCallback((listener: TreeEventListener) => {
		listenersRef.current.add(listener);
		return () => {
			listenersRef.current.delete(listener);
		};
	}, []);

	const dispatchEvent = useCallback((event: TreeEventType) => {
		listenersRef.current.forEach(listener => listener(event));

		// If a drop targets a branch that isn't mounted yet, queue the item
		// so the branch can pick it up when it mounts.
		if (event.type === 'item-drop-requested') {
			const { targetBranchId, item, targetIndex } = event.payload;
			if (!branchRegistry.current.has(targetBranchId)) {
				const pending = pendingItemsRef.current.get(targetBranchId) ?? [];
				pending.push({ item, index: targetIndex });
				pendingItemsRef.current.set(targetBranchId, pending);
			}
		}
	}, []);

	const consumePendingItems = useCallback((branchId: string | null): PendingItem[] => {
		const pending = pendingItemsRef.current.get(branchId) ?? [];
		pendingItemsRef.current.delete(branchId);
		return pending;
	}, []);

	// Read items directly from a registered branch's handlers.
	// Used during render phase when a branch remounts in the same commit —
	// the old branch instance is still in the registry at that point.
	const getBranchItems = useCallback((branchId: string | null): TreeItem[] | undefined => {
		const handlers = branchRegistry.current.get(branchId);
		if (!handlers) return undefined;
		return [...handlers.getItems()]; // copy to avoid sharing the ref
	}, []);

	// Fallback for different-commit remounts (e.g. collapse then re-expand).
	// The old branch's effect cleanup saves state before unregistering.
	const consumeSavedBranchState = useCallback((branchId: string | null): TreeItem[] | undefined => {
		const saved = savedBranchStateRef.current.get(branchId);
		savedBranchStateRef.current.delete(branchId);
		return saved;
	}, []);

	const findItemBranch = useCallback((itemId: string): string | null | undefined => {
		for (const [branchId, handlers] of branchRegistry.current.entries()) {
			const items = handlers.getItems();
			if (items.some(item => item.id === itemId)) {
				return branchId;
			}
		}
		return undefined;
	}, []);

	const getPathToItem = useCallback((itemId: string): string[] => {
		const path: string[] = [];

		// Find the item and build path by traversing branches
		function findInBranch(branchId: string | null): boolean {
			const handlers = branchRegistry.current.get(branchId);
			if (!handlers) return false;

			const items = handlers.getItems();
			for (const item of items) {
				if (item.id === itemId) {
					return true;
				}
				// Check if this item has a registered branch (meaning it has children)
				if (branchRegistry.current.has(item.id)) {
					if (findInBranch(item.id)) {
						path.unshift(item.id);
						return true;
					}
				}
			}
			return false;
		}

		findInBranch(null); // Start from root
		return path;
	}, []);

	const getItem = useCallback((itemId: string): TreeItem | undefined => {
		for (const handlers of branchRegistry.current.values()) {
			const items = handlers.getItems();
			const item = items.find(i => i.id === itemId);
			if (item) return item;
		}
		return undefined;
	}, []);

	const getInitialBranchItems = useCallback((branchId: string | null): TreeItem[] | undefined => {
		return initialBranchDataRef.current.get(branchId);
	}, []);

	const itemHasChildren = useCallback((itemId: string): boolean => {
		// Check registered branch first (runtime state, post-move)
		const handlers = branchRegistry.current.get(itemId);
		if (handlers) return handlers.getItems().length > 0;
		// Check saved state (branch unmounted but state preserved)
		const saved = savedBranchStateRef.current.get(itemId);
		if (saved) return saved.length > 0;
		// Check pending items (drop targeting unmounted branch)
		const pending = pendingItemsRef.current.get(itemId);
		if (pending) return pending.length > 0;
		// Check initial data (before branch mounts)
		return (initialBranchDataRef.current.get(itemId)?.length ?? 0) > 0;
	}, []);

	const contextValue = useMemo<TreeRootContextValue>(() => ({
		uniqueContextId,
		registerBranch,
		findItemBranch,
		getItem,
		getPathToItem,
		itemHasChildren,
		getInitialBranchItems,
		addEventListener,
		dispatchEvent,
		consumePendingItems,
		getBranchItems,
		consumeSavedBranchState,
	}), [uniqueContextId, registerBranch, findItemBranch, getItem, getPathToItem, itemHasChildren, getInitialBranchItems, addEventListener, dispatchEvent, consumePendingItems, getBranchItems, consumeSavedBranchState]);

	return (
		<TreeRootContext.Provider value={contextValue}>
			{children}
		</TreeRootContext.Provider>
	);
}

export function useTreeRootContext() {
	const context = useContext(TreeRootContext);
	if (!context) {
		throw new Error('useTreeRootContext must be used within a TreeRootProvider');
	}
	return context;
}
