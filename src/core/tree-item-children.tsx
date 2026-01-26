import React, {
	useContext,
	useEffect,
	useRef,
	useState,
	type ReactNode,
	type HTMLAttributes,
} from 'react';
import invariant from 'tiny-invariant';
import {
	dropTargetForElements,
	type ElementDropTargetEventBasePayload,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { GroupDropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/group';

import { TreeContext } from './contexts.ts';
import { TreeItemContext } from './tree-item.tsx';
import { TreeEndZone } from './tree-end-zone.tsx';

export type TreeItemChildrenState = 'idle' | 'is-innermost-over';

export type TreeItemChildrenProps = HTMLAttributes<HTMLDivElement> & {
	children: ReactNode;
};

export function TreeItemChildren({ children, ...props }: TreeItemChildrenProps) {
	const itemContext = useContext(TreeItemContext);
	invariant(itemContext, 'TreeItemChildren must be used within a TreeItem');

	const { item } = itemContext;
	const { uniqueContextId } = useContext(TreeContext);
	const groupRef = useRef<HTMLDivElement>(null);
	const [groupState, setGroupState] = useState<TreeItemChildrenState>('idle');

	useEffect(() => {
		const group = groupRef.current;
		if (!group) return;

		function onChange({ location, self }: ElementDropTargetEventBasePayload) {
			const [innerMost] = location.current.dropTargets.filter(
				(dropTarget) => dropTarget.data.type === 'group',
			);

			setGroupState(innerMost?.element === self.element ? 'is-innermost-over' : 'idle');
		}

		return dropTargetForElements({
			element: group,
			canDrop: ({ source }) =>
				source.data.type === 'tree-item' &&
				source.data.id !== item.id &&
				source.data.uniqueContextId === uniqueContextId,
			getData: () => ({ type: 'group', parentId: item.id }),
			getIsSticky: () => false,
			onDragStart: onChange,
			onDropTargetChange: onChange,
			onDragLeave: () => setGroupState('idle'),
			onDrop: () => setGroupState('idle'),
		});
	}, [item.id, uniqueContextId]);

	// Only render if item is open and has children
	if (!item.children.length || !item.isOpen) {
		return null;
	}

	return (
		<div
			id={`tree-item-${item.id}--subtree`}
			data-tree-children
			{...props}
		>
			<GroupDropIndicator isActive={groupState === 'is-innermost-over'} ref={groupRef}>
				{children}
			</GroupDropIndicator>
			<TreeEndZone parentId={item.id} />
		</div>
	);
}
