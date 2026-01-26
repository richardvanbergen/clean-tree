// Primitives (pure functions, no React)
export type { TreeItem, TreeState, TreeAction } from './primitives/index.ts';
export { tree, treeStateReducer, dataReducer, getChildItems } from './primitives/index.ts';

// Core components (headless)
export {
	TreeContext,
	DependencyContext,
	type TreeContextValue,
	type DependencyContextValue,
} from './core/index.ts';
export { TreeProvider, type TreeProviderProps } from './core/index.ts';
export { TreeRoot, type TreeRootProps, type TreeRootState } from './core/index.ts';
export {
	TreeItem as TreeItemCore,
	TreeItemContext,
	type TreeItemProps,
	type TreeItemState,
	type TreeItemContextValue,
	type TreeItemRenderProps,
} from './core/index.ts';
export { TreeItemContent, type TreeItemContentProps } from './core/index.ts';
export { TreeItemTrigger, type TreeItemTriggerProps } from './core/index.ts';
export { TreeItemChildren, type TreeItemChildrenProps, type TreeItemChildrenState } from './core/index.ts';

// High-level components
export { Tree, type TreeProps } from './components/index.ts';
export { MoveDialog, type MoveDialogProps } from './components/index.ts';

// Hooks
export { useTree } from './hooks/index.ts';
export { useTreeItem } from './hooks/index.ts';
