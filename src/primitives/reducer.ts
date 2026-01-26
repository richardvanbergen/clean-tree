import invariant from 'tiny-invariant';
import type { TreeItem, TreeState, TreeAction } from './types.ts';
import { tree } from './operations.ts';

export function treeStateReducer(state: TreeState, action: TreeAction): TreeState {
	return {
		data: dataReducer(state.data, action),
		lastAction: action,
	};
}

export function dataReducer(data: TreeItem[], action: TreeAction): TreeItem[] {
	const item = tree.find(data, action.itemId);
	if (!item) {
		return data;
	}

	if (action.type === 'instruction') {
		const instruction = action.instruction;

		if (action.itemId === action.targetId) {
			return data;
		}

		if (action.instruction.blocked) {
			return data;
		}

		if (instruction.operation === 'reorder-before') {
			let result = tree.remove(data, action.itemId);
			result = tree.insertBefore(result, action.targetId, item);
			return result;
		}

		if (instruction.operation === 'reorder-after') {
			let result = tree.remove(data, action.itemId);
			result = tree.insertAfter(result, action.targetId, item);
			return result;
		}

		if (instruction.operation === 'combine') {
			let result = tree.remove(data, action.itemId);
			result = tree.insertChild(result, action.targetId, item);
			return result;
		}

		return data;
	}

	function toggle(item: TreeItem): TreeItem {
		if (!tree.hasChildren(item)) {
			return item;
		}

		if (item.id === action.itemId) {
			return { ...item, isOpen: !item.isOpen };
		}

		return { ...item, children: item.children.map(toggle) };
	}

	if (action.type === 'toggle') {
		return data.map(toggle);
	}

	if (action.type === 'expand') {
		if (tree.hasChildren(item) && !item.isOpen) {
			return data.map(toggle);
		}
		return data;
	}

	if (action.type === 'collapse') {
		if (tree.hasChildren(item) && item.isOpen) {
			return data.map(toggle);
		}
		return data;
	}

	if (action.type === 'modal-move') {
		let result = tree.remove(data, item.id);

		const siblingItems = getChildItems(result, action.targetId);

		if (siblingItems.length === 0) {
			if (action.targetId === '') {
				result = [item];
			} else {
				result = tree.insertChild(result, action.targetId, item);
			}
		} else if (action.index === siblingItems.length) {
			const relativeTo = siblingItems[siblingItems.length - 1];
			invariant(relativeTo);
			result = tree.insertAfter(result, relativeTo.id, item);
		} else {
			const relativeTo = siblingItems[action.index];
			invariant(relativeTo);
			result = tree.insertBefore(result, relativeTo.id, item);
		}

		return result;
	}

	return data;
}

export function getChildItems(data: TreeItem[], targetId: string): TreeItem[] {
	if (targetId === '') {
		return data;
	}

	const targetItem = tree.find(data, targetId);
	invariant(targetItem);

	return targetItem.children;
}
