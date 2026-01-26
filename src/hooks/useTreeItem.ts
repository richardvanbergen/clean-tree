import { useContext } from 'react';
import invariant from 'tiny-invariant';
import { TreeItemContext } from '../core/TreeItem.tsx';

export function useTreeItem() {
	const context = useContext(TreeItemContext);
	invariant(context, 'useTreeItem must be used within a TreeItem');
	return {
		item: context.item,
		level: context.level,
		index: context.index,
		state: context.state,
		instruction: context.instruction,
		isDragging: context.state === 'dragging',
		isDropTarget: context.instruction !== null,
		toggleOpen: context.toggleOpen,
		openMoveDialog: context.openMoveDialog,
		closeMoveDialog: context.closeMoveDialog,
		isMoveDialogOpen: context.isMoveDialogOpen,
	};
}
