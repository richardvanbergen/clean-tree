export type TreeItem = {
	id: string;
	isOpen?: boolean;
	isFolder?: boolean;
};

/**
 * Input format for initial tree data (nested with children).
 * Flattened into TreeItem[] per branch on mount.
 */
export type TreeItemData = {
	id: string;
	isOpen?: boolean;
	isFolder?: boolean;
	children?: TreeItemData[];
};
