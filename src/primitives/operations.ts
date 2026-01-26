import type { TreeItem } from './types.ts';

export const tree = {
	remove(data: TreeItem[], id: string): TreeItem[] {
		return data
			.filter((item) => item.id !== id)
			.map((item) => {
				if (tree.hasChildren(item)) {
					return {
						...item,
						children: tree.remove(item.children, id),
					};
				}
				return item;
			});
	},

	insertBefore(data: TreeItem[], targetId: string, newItem: TreeItem): TreeItem[] {
		return data.flatMap((item) => {
			if (item.id === targetId) {
				return [newItem, item];
			}
			if (tree.hasChildren(item)) {
				return {
					...item,
					children: tree.insertBefore(item.children, targetId, newItem),
				};
			}
			return item;
		});
	},

	insertAfter(data: TreeItem[], targetId: string, newItem: TreeItem): TreeItem[] {
		return data.flatMap((item) => {
			if (item.id === targetId) {
				return [item, newItem];
			}

			if (tree.hasChildren(item)) {
				return {
					...item,
					children: tree.insertAfter(item.children, targetId, newItem),
				};
			}

			return item;
		});
	},

	insertChild(data: TreeItem[], targetId: string, newItem: TreeItem): TreeItem[] {
		return data.flatMap((item) => {
			if (item.id === targetId) {
				return {
					...item,
					isOpen: true,
					children: [newItem, ...item.children],
				};
			}

			if (!tree.hasChildren(item)) {
				return item;
			}

			return {
				...item,
				children: tree.insertChild(item.children, targetId, newItem),
			};
		});
	},

	find(data: TreeItem[], itemId: string): TreeItem | undefined {
		for (const item of data) {
			if (item.id === itemId) {
				return item;
			}

			if (tree.hasChildren(item)) {
				const result = tree.find(item.children, itemId);
				if (result) {
					return result;
				}
			}
		}
	},

	getPathToItem({
		current,
		targetId,
		parentIds = [],
	}: {
		current: TreeItem[];
		targetId: string;
		parentIds?: string[];
	}): string[] | undefined {
		for (const item of current) {
			if (item.id === targetId) {
				return parentIds;
			}
			const nested = tree.getPathToItem({
				current: item.children,
				targetId: targetId,
				parentIds: [...parentIds, item.id],
			});
			if (nested) {
				return nested;
			}
		}
	},

	hasChildren(item: TreeItem): boolean {
		return item.children.length > 0;
	},
};
