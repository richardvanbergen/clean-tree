import React, {
	useContext,
	useEffect,
	useRef,
	useState,
	type ReactNode,
	type HTMLAttributes,
} from 'react';
import invariant from 'tiny-invariant';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
	dropTargetForElements,
	type ElementDropTargetEventBasePayload,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { GroupDropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/group';

import { TreeContext } from './contexts.ts';
import { TreeEndZone } from './tree-end-zone.tsx';

export type TreeRootProps = HTMLAttributes<HTMLDivElement> & {
	children: ReactNode;
};

export type TreeRootState = 'idle' | 'is-innermost-over';

export function TreeRoot({ children, ...props }: TreeRootProps) {
	const rootRef = useRef<HTMLDivElement>(null);
	const groupRef = useRef<HTMLDivElement>(null);
	const { uniqueContextId } = useContext(TreeContext);
	const [dropTargetState, setDropTargetState] = useState<TreeRootState>('idle');

	useEffect(() => {
		invariant(rootRef.current);
		invariant(groupRef.current);

		function onDropTargetChange({ location, self }: ElementDropTargetEventBasePayload) {
			const [innerMost] = location.current.dropTargets.filter(
				(dropTarget) => dropTarget.data.type === 'group',
			);

			setDropTargetState(innerMost?.element === self.element ? 'is-innermost-over' : 'idle');
		}

		return combine(
			dropTargetForElements({
				element: groupRef.current,
				canDrop: ({ source }) =>
					source.data.uniqueContextId === uniqueContextId &&
					source.data.type === 'tree-item',
				getData: () => ({ type: 'group', parentId: '' }), // empty string = root level
				onDragStart: onDropTargetChange,
				onDropTargetChange: onDropTargetChange,
				onDragLeave: () => setDropTargetState('idle'),
				onDrop: () => setDropTargetState('idle'),
			}),
		);
	}, [uniqueContextId]);

	return (
		<div ref={rootRef} {...props}>
			<GroupDropIndicator isActive={dropTargetState === 'is-innermost-over'} ref={groupRef}>
				{children}
			</GroupDropIndicator>
			<TreeEndZone parentId="" />
		</div>
	);
}
