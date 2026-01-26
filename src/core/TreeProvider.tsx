import React, {
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
	type ReactNode,
} from 'react';
import memoizeOne from 'memoize-one';
import invariant from 'tiny-invariant';
import { triggerPostMoveFlash } from '@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash';
import * as liveRegion from '@atlaskit/pragmatic-drag-and-drop-live-region';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

import { TreeContext, DependencyContext, type TreeContextValue } from './contexts.ts';
import { tree, treeStateReducer, type TreeItem, type TreeState } from '../primitives/index.ts';

type CleanupFn = () => void;

function createTreeItemRegistry() {
	const registry = new Map<string, { element: HTMLElement; actionMenuTrigger: HTMLElement }>();

	const registerTreeItem = ({
		itemId,
		element,
		actionMenuTrigger,
	}: {
		itemId: string;
		element: HTMLElement;
		actionMenuTrigger: HTMLElement;
	}): CleanupFn => {
		registry.set(itemId, { element, actionMenuTrigger });
		return () => {
			registry.delete(itemId);
		};
	};

	return { registry, registerTreeItem };
}

export type TreeProviderProps = {
	children: ReactNode;
	items: TreeItem[];
	onItemsChange?: (items: TreeItem[]) => void;
	getItemName?: (item: TreeItem) => string;
};

export function TreeProvider({
	children,
	items,
	onItemsChange,
	getItemName = (item) => `Item ${item.id}`,
}: TreeProviderProps) {
	const initialState: TreeState = { data: items, lastAction: null };
	const [state, updateState] = useReducer(treeStateReducer, initialState);
	const { extractInstruction } = useContext(DependencyContext);

	const [{ registry, registerTreeItem }] = useState(createTreeItemRegistry);

	const { data, lastAction } = state;
	const lastStateRef = useRef<TreeItem[]>(data);
	const lastReportedRef = useRef<TreeItem[]>(data);

	useEffect(() => {
		lastStateRef.current = data;
	}, [data]);

	// Notify parent of changes (only when data actually changes from our actions)
	useEffect(() => {
		if (onItemsChange && data !== lastReportedRef.current) {
			lastReportedRef.current = data;
			onItemsChange(data);
		}
	}, [data, onItemsChange]);

	// Handle post-action effects (flash, focus, announce)
	useEffect(() => {
		if (lastAction === null) {
			return;
		}

		setTimeout(() => {
			if (lastAction.type === 'modal-move') {
				const parentName =
					lastAction.targetId === ''
						? 'the root'
						: getItemName(tree.find(lastStateRef.current, lastAction.targetId) ?? { id: lastAction.targetId, children: [] });

				liveRegion.announce(
					`You've moved ${getItemName(tree.find(lastStateRef.current, lastAction.itemId) ?? { id: lastAction.itemId, children: [] })} to position ${
						lastAction.index + 1
					} in ${parentName}.`,
				);

				const { element, actionMenuTrigger } = registry.get(lastAction.itemId) ?? {};
				if (element) {
					triggerPostMoveFlash(element);
				}

				actionMenuTrigger?.focus();
				return;
			}

			if (lastAction.type === 'instruction') {
				const { element } = registry.get(lastAction.itemId) ?? {};
				if (element) {
					triggerPostMoveFlash(element);
				}
				return;
			}
		});
	}, [lastAction, registry, getItemName]);

	// Cleanup live region on unmount
	useEffect(() => {
		return () => {
			liveRegion.cleanup();
		};
	}, []);

	// Get valid move targets for an item
	const getMoveTargets = useCallback(({ itemId }: { itemId: string }) => {
		const data = lastStateRef.current;
		const targets: TreeItem[] = [];

		const searchStack = Array.from(data);
		while (searchStack.length > 0) {
			const node = searchStack.pop();
			if (!node) continue;

			// Can't move to self or children
			if (node.id === itemId) continue;

			// Draft items cannot have children
			if (node.isDraft) continue;

			targets.push(node);
			node.children.forEach((childNode) => searchStack.push(childNode));
		}

		return targets;
	}, []);

	const getChildrenOfItem = useCallback((itemId: string) => {
		const data = lastStateRef.current;

		if (itemId === '') {
			return data;
		}

		const item = tree.find(data, itemId);
		invariant(item);
		return item.children;
	}, []);

	const uniqueContextId = useMemo(() => Symbol('tree-context'), []);

	const context = useMemo<TreeContextValue>(
		() => ({
			dispatch: updateState,
			uniqueContextId,
			getPathToItem: memoizeOne(
				(targetId: string) => tree.getPathToItem({ current: lastStateRef.current, targetId }) ?? [],
			),
			getMoveTargets,
			getChildrenOfItem,
			registerTreeItem,
		}),
		[uniqueContextId, getMoveTargets, getChildrenOfItem, registerTreeItem],
	);

	// Monitor for drop events
	useEffect(() => {
		return monitorForElements({
			canMonitor: ({ source }) =>
				source.data.uniqueContextId === context.uniqueContextId &&
				source.data.type === 'tree-item',
			onDrop(args) {
				const { location, source } = args;
				if (!location.current.dropTargets.length) {
					return;
				}

				const itemId = source.data.id as string;
				const target = location.current.dropTargets[0];
				invariant(target);
				const targetId = target.data.id as string;

				const instruction = extractInstruction(target.data);

				if (instruction !== null) {
					updateState({
						type: 'instruction',
						instruction,
						itemId,
						targetId,
					});
				}
			},
		});
	}, [context, extractInstruction]);

	return <TreeContext.Provider value={context}>{children}</TreeContext.Provider>;
}
