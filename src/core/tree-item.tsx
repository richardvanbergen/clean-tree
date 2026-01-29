import React, {
	createContext,
	memo,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
	type HTMLAttributes,
} from 'react';
import invariant from 'tiny-invariant';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
	draggable,
	dropTargetForElements,
	type ElementDropTargetEventBasePayload,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import type { Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { createRoot } from 'react-dom/client';

import { TreeContext, DependencyContext } from './contexts.ts';
import { TreeBranchContext } from './tree-branch.tsx';
import type { TreeItem as TreeItemType } from '../primitives/types.ts';

export type TreeItemState = 'idle' | 'dragging';

export type TreeItemContextValue = {
	item: TreeItemType;
	level: number;
	state: TreeItemState;
	instruction: Instruction | null;
	isOpen: boolean;
	hasChildren: boolean;
	toggleOpen: () => void;
	dragHandleRef: React.RefObject<HTMLElement | null>;
};

export const TreeItemContext = createContext<TreeItemContextValue | null>(null);

function delay({ waitMs, fn }: { waitMs: number; fn: () => void }): () => void {
	let timeoutId: ReturnType<typeof setTimeout> | null = setTimeout(() => {
		timeoutId = null;
		fn();
	}, waitMs);
	return function cancel() {
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	};
}

export type TreeItemRenderProps = {
	item: TreeItemType;
	level: number;
	state: TreeItemState;
	instruction: Instruction | null;
	isOpen: boolean;
	hasChildren: boolean;
	toggleOpen: () => void;
	dragHandleRef: React.RefObject<HTMLElement | null>;
};

export type TreeItemProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
	item: TreeItemType;
	level: number;
	index: number;
	indentPerLevel?: number;
	children: (props: TreeItemRenderProps) => ReactNode;
};

export const TreeItem = memo(function TreeItem({
	item,
	level,
	index,
	indentPerLevel = 20,
	children,
	...props
}: TreeItemProps) {
	const dragHandleRef = useRef<HTMLElement>(null);
	const rowRef = useRef<HTMLDivElement>(null);

	const [state, setState] = useState<TreeItemState>('idle');
	const [instruction, setInstruction] = useState<Instruction | null>(null);
	const cancelExpandRef = useRef<(() => void) | null>(null);

	const { uniqueContextId, registerTreeItem, getPathToItem, findItemBranch, getItem, itemHasChildren, dispatchEvent } = useContext(TreeContext);
	const { attachInstruction, extractInstruction } = useContext(DependencyContext);
	const branchContext = useContext(TreeBranchContext);

	const isOpen = item.isOpen ?? false;
	const hasChildren = itemHasChildren(item.id);

	const toggleOpen = useCallback(() => {
		if (branchContext) {
			branchContext.toggleItem(item.id);
		}
	}, [branchContext, item.id]);

	const expandItem = useCallback(() => {
		if (branchContext) {
			branchContext.expandItem(item.id);
		}
	}, [branchContext, item.id]);

	// Register tree item
	useEffect(() => {
		const element = rowRef.current;
		if (!element) return;
		return registerTreeItem({
			itemId: item.id,
			element,
			actionMenuTrigger: element,
		});
	}, [item.id, registerTreeItem]);

	const cancelExpand = useCallback(() => {
		cancelExpandRef.current?.();
		cancelExpandRef.current = null;
	}, []);

	// Setup drag and drop
	useEffect(() => {
		const element = rowRef.current;
		const dragHandle = dragHandleRef.current ?? element;
		invariant(element);
		invariant(dragHandle);

		function onChange({ self, location }: ElementDropTargetEventBasePayload) {
			// Only show instruction on innermost drop target
			const innerMost = location.current.dropTargets[0];
			if (innerMost?.element !== self.element) {
				setInstruction(null);
				return;
			}

			const instruction = extractInstruction(self.data) as Instruction | null;

			// Auto-expand after 500ms when hovering to make-child
			if (
				instruction?.type === 'make-child' &&
				hasChildren &&
				!isOpen &&
				!cancelExpandRef.current
			) {
				cancelExpandRef.current = delay({
					waitMs: 500,
					fn: expandItem,
				});
			}
			if (instruction?.type !== 'make-child' && cancelExpandRef.current) {
				cancelExpand();
			}

			setInstruction(instruction);
		}

		return combine(
			draggable({
				element: dragHandle,
				getInitialData: () => ({
					id: item.id,
					type: 'tree-item',
					isOpenOnDragStart: isOpen,
					uniqueContextId,
				}),
				onGenerateDragPreview: ({ nativeSetDragImage }) => {
					setCustomNativeDragPreview({
						getOffset: pointerOutsideOfPreview({ x: '16px', y: '8px' }),
						render: ({ container }) => {
							const root = createRoot(container);
							root.render(
								<div style={{
									padding: '4px 8px',
									background: '#fff',
									borderRadius: 3,
									boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
									fontSize: 14,
								}}>
									{item.id}
								</div>
							);
							return () => root.unmount();
						},
						nativeSetDragImage,
					});
				},
				onDragStart: () => setState('dragging'),
				onDrop: () => setState('idle'),
			}),
			dropTargetForElements({
				element,
				getData: ({ input, element }) => {
					const data = { id: item.id, index };

					return attachInstruction(data, {
						input,
						element,
						indentPerLevel,
						currentLevel: level,
						mode: isOpen ? 'expanded' : 'standard',
						block: [],
					});
				},
				canDrop: ({ source }) => {
					if (source.data.type !== 'tree-item') return false;
					if (source.data.id === item.id) return false;
					if (source.data.uniqueContextId !== uniqueContextId) return false;

					// Prevent dropping onto descendants
					const pathToTarget = getPathToItem(item.id);
					const draggedId = source.data.id as string;
					if (pathToTarget.includes(draggedId)) return false;

					return true;
				},
				onDragEnter: onChange,
				onDrag: onChange,
				onDragLeave: () => {
					cancelExpand();
					setInstruction(null);
				},
				onDrop: (args) => {
					cancelExpand();
					setInstruction(null);

					const { source, location } = args;
					if (!location.current.dropTargets.length) return;

					const target = location.current.dropTargets[0];
					if (!target) return;

					const draggedItemId = source.data.id as string;
					const targetId = target.data.id as string;
					const targetIndex = target.data.index as number;
					const dropInstruction = extractInstruction(target.data) as Instruction | null;

					if (!dropInstruction) return;

					// Look up the dragged item and its source branch
					const sourceBranchId = findItemBranch(draggedItemId);
					if (sourceBranchId === undefined) return;

					const draggedItem = getItem(draggedItemId);
					if (!draggedItem) return;

					// Determine target branch and index based on instruction
					let targetBranchId: string | null = null;
					let finalIndex = targetIndex;

					switch (dropInstruction.type) {
						case 'reorder-above':
							targetBranchId = findItemBranch(targetId) ?? null;
							finalIndex = targetIndex;
							break;

						case 'reorder-below':
							targetBranchId = findItemBranch(targetId) ?? null;
							finalIndex = targetIndex + 1;
							break;

						case 'make-child':
							targetBranchId = targetId;
							finalIndex = 0;
							// Auto-expand target if not open
							if (branchContext) {
								branchContext.expandItem(targetId);
							}
							break;

						case 'reparent': {
							const path = getPathToItem(targetId);
							const ancestorId = dropInstruction.desiredLevel === 0
								? null
								: path[dropInstruction.desiredLevel - 1] ?? null;
							targetBranchId = ancestorId;
							finalIndex = targetIndex + 1;
							break;
						}
					}

					if (targetBranchId === undefined) return;

					// Dispatch drop request event with full item data
					dispatchEvent({
						type: 'item-drop-requested',
						payload: {
							itemId: draggedItemId,
							item: draggedItem,
							sourceBranchId,
							targetBranchId,
							targetIndex: finalIndex,
							instruction: dropInstruction,
						},
					});
				},
			}),
		);
	}, [
		item,
		index,
		level,
		indentPerLevel,
		isOpen,
		hasChildren,
		cancelExpand,
		expandItem,
		uniqueContextId,
		extractInstruction,
		attachInstruction,
		getPathToItem,
		findItemBranch,
		getItem,
		dispatchEvent,
		branchContext,
	]);

	// Cleanup on unmount
	useEffect(() => {
		return () => cancelExpand();
	}, [cancelExpand]);

	const contextValue = useMemo<TreeItemContextValue>(
		() => ({
			item,
			level,
			state,
			instruction,
			isOpen,
			hasChildren,
			toggleOpen,
			dragHandleRef,
		}),
		[item, level, state, instruction, isOpen, hasChildren, toggleOpen],
	);

	const renderProps: TreeItemRenderProps = {
		item,
		level,
		state,
		instruction,
		isOpen,
		hasChildren,
		toggleOpen,
		dragHandleRef,
	};

	return (
		<TreeItemContext.Provider value={contextValue}>
			<div ref={rowRef} data-tree-item data-item-id={item.id} data-level={level} {...props}>
				{children(renderProps)}
			</div>
		</TreeItemContext.Provider>
	);
});
