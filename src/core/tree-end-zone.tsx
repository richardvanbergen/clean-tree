import React, {
	useContext,
	useEffect,
	useRef,
	useState,
	type HTMLAttributes,
} from 'react';
import {
	dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

import { TreeContext } from './contexts.ts';

export type TreeEndZoneProps = HTMLAttributes<HTMLDivElement> & {
	parentId: string; // empty string for root level
};

export function TreeEndZone({ parentId, style, ...props }: TreeEndZoneProps) {
	const { uniqueContextId, getPathToItem } = useContext(TreeContext);
	const ref = useRef<HTMLDivElement>(null);
	const [isOver, setIsOver] = useState(false);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;

		return dropTargetForElements({
			element,
			canDrop: ({ source }) => {
				if (source.data.type !== 'tree-item') return false;
				if (source.data.uniqueContextId !== uniqueContextId) return false;

				const draggedId = source.data.id as string;

				// Can't drop into itself or descendants
				if (parentId !== '' && parentId !== draggedId) {
					const pathToParent = getPathToItem(parentId);
					if (pathToParent.includes(draggedId)) return false;
				}
				if (parentId === draggedId) return false;

				return true;
			},
			getData: () => ({ type: 'group', parentId }),
			onDragEnter: () => setIsOver(true),
			onDragLeave: () => setIsOver(false),
			onDrop: () => setIsOver(false),
		});
	}, [uniqueContextId, parentId, getPathToItem]);

	return (
		<div
			ref={ref}
			data-tree-end-zone
			data-parent-id={parentId || 'root'}
			data-is-over={isOver}
			style={{
				minHeight: isOver ? 24 : 8,
				borderRadius: 4,
				background: isOver ? 'rgba(0, 82, 204, 0.1)' : 'transparent',
				border: isOver ? '2px dashed #0052cc' : '2px dashed transparent',
				...style,
			}}
			{...props}
		/>
	);
}
