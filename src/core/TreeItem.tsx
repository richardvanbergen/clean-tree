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
import type { Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/list-item';
import { createRoot } from 'react-dom/client';

import { TreeContext, DependencyContext } from './contexts.ts';
import type { TreeItem as TreeItemType } from '../primitives/types.ts';

export type TreeItemState = 'idle' | 'dragging' | 'preview';

export type TreeItemContextValue = {
	item: TreeItemType;
	level: number;
	index: number;
	state: TreeItemState;
	instruction: Instruction | null;
	toggleOpen: () => void;
	openMoveDialog: () => void;
	closeMoveDialog: () => void;
	isMoveDialogOpen: boolean;
	buttonRef: React.RefObject<HTMLButtonElement | null>;
	actionMenuTriggerRef: React.RefObject<HTMLElement | null>;
};

export const TreeItemContext = createContext<TreeItemContextValue | null>(null);

function countDescendants(item: TreeItemType): number {
	let count = 0;
	for (const child of item.children) {
		count += 1 + countDescendants(child);
	}
	return count;
}

function DefaultDragPreview({ item }: { item: TreeItemType }) {
	const descendantCount = countDescendants(item);
	return (
		<div style={{
			padding: '8px 12px',
			background: '#fff',
			borderRadius: 3,
			boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
			display: 'flex',
			alignItems: 'center',
			gap: 8,
		}}>
			<span>Item {item.id}</span>
			{descendantCount > 0 && (
				<span style={{
					fontSize: 11,
					background: '#e0e0e0',
					padding: '2px 6px',
					borderRadius: 10,
				}}>
					+{descendantCount} item{descendantCount > 1 ? 's' : ''}
				</span>
			)}
		</div>
	);
}

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
	index: number;
	state: TreeItemState;
	instruction: Instruction | null;
	toggleOpen: () => void;
	openMoveDialog: () => void;
	closeMoveDialog: () => void;
	isMoveDialogOpen: boolean;
};

export type TreeItemChildren = ReactNode | ((props: TreeItemRenderProps) => ReactNode);

export type TreeItemProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
	item: TreeItemType;
	level: number;
	index: number;
	children: TreeItemChildren;
	renderPreview?: (item: TreeItemType) => ReactNode;
};

export const TreeItem = memo(function TreeItem({
	item,
	level,
	index,
	children,
	renderPreview,
	...props
}: TreeItemProps) {
	const buttonRef = useRef<HTMLButtonElement>(null);
	const actionMenuTriggerRef = useRef<HTMLElement>(null);

	const [state, setState] = useState<TreeItemState>('idle');
	const [instruction, setInstruction] = useState<Instruction | null>(null);
	const cancelExpandRef = useRef<(() => void) | null>(null);
	const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);

	const { dispatch, uniqueContextId, registerTreeItem, getPathToItem } = useContext(TreeContext);
	const { attachInstruction, extractInstruction } = useContext(DependencyContext);

	const toggleOpen = useCallback(() => {
		dispatch({ type: 'toggle', itemId: item.id });
	}, [dispatch, item.id]);

	const openMoveDialog = useCallback(() => {
		setIsMoveDialogOpen(true);
	}, []);

	const closeMoveDialog = useCallback(() => {
		setIsMoveDialogOpen(false);
	}, []);

	// Register tree item
	useEffect(() => {
		if (!buttonRef.current) return;
		// actionMenuTriggerRef may not exist if no action trigger is rendered
		const actionTrigger = actionMenuTriggerRef.current ?? buttonRef.current;
		return registerTreeItem({
			itemId: item.id,
			element: buttonRef.current,
			actionMenuTrigger: actionTrigger,
		});
	}, [item.id, registerTreeItem]);

	const cancelExpand = useCallback(() => {
		cancelExpandRef.current?.();
		cancelExpandRef.current = null;
	}, []);

	// Setup drag and drop
	useEffect(() => {
		invariant(buttonRef.current);

		function onChange({ self }: ElementDropTargetEventBasePayload) {
			const instruction = extractInstruction(self.data);

			// Auto-expand after 500ms when hovering over a parent
			if (
				instruction?.operation === 'combine' &&
				item.children.length &&
				!item.isOpen &&
				!cancelExpandRef.current
			) {
				cancelExpandRef.current = delay({
					waitMs: 500,
					fn: () => dispatch({ type: 'expand', itemId: item.id }),
				});
			}
			if (instruction?.operation !== 'combine' && cancelExpandRef.current) {
				cancelExpand();
			}

			setInstruction(instruction);
		}

		return combine(
			draggable({
				element: buttonRef.current,
				getInitialData: () => ({
					id: item.id,
					type: 'tree-item',
					isOpenOnDragStart: item.isOpen,
					uniqueContextId,
				}),
				onGenerateDragPreview: ({ nativeSetDragImage }) => {
					setCustomNativeDragPreview({
						getOffset: pointerOutsideOfPreview({ x: '16px', y: '8px' }),
						render: ({ container }) => {
							const root = createRoot(container);
							root.render(
								renderPreview ? (
									renderPreview(item)
								) : (
									<DefaultDragPreview item={item} />
								),
							);
							return () => root.unmount();
						},
						nativeSetDragImage,
					});
				},
				onDragStart: () => {
					setState('dragging');
				},
				onDrop: () => {
					setState('idle');
				},
			}),
			dropTargetForElements({
				element: buttonRef.current,
				getData: ({ input, element }) => {
					const data = { id: item.id };

					return attachInstruction(data, {
						input,
						element,
						operations: item.isDraft
							? { combine: 'blocked' }
							: {
									combine: 'available',
									'reorder-before': 'available',
									'reorder-after':
										item.isOpen && item.children.length ? 'not-available' : 'available',
								},
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
				onDrop: () => {
					cancelExpand();
					setInstruction(null);
				},
			}),
		);
	}, [
		dispatch,
		item,
		cancelExpand,
		uniqueContextId,
		extractInstruction,
		attachInstruction,
		getPathToItem,
		renderPreview,
	]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			cancelExpand();
		};
	}, [cancelExpand]);

	const contextValue = useMemo<TreeItemContextValue>(
		() => ({
			item,
			level,
			index,
			state,
			instruction,
			toggleOpen,
			openMoveDialog,
			closeMoveDialog,
			isMoveDialogOpen,
			buttonRef,
			actionMenuTriggerRef,
		}),
		[item, level, index, state, instruction, toggleOpen, openMoveDialog, closeMoveDialog, isMoveDialogOpen],
	);

	const renderProps: TreeItemRenderProps = {
		item,
		level,
		index,
		state,
		instruction,
		toggleOpen,
		openMoveDialog,
		closeMoveDialog,
		isMoveDialogOpen,
	};

	return (
		<TreeItemContext.Provider value={contextValue}>
			<div data-tree-item data-item-id={item.id} data-level={level} {...props}>
				{typeof children === 'function' ? children(renderProps) : children}
			</div>
		</TreeItemContext.Provider>
	);
});
