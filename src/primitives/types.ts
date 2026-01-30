export type TreeItem = {
	id: string;
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

export type MoveItemArgs = {
	itemId: string;
	sourceBranchId: string | null;
	targetBranchId: string | null;
	targetIndex: number;
};

export type MoveItemResult = {
	sourceBranchItems: TreeItem[];
	targetBranchItems: TreeItem[];
};
