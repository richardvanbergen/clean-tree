// Types
export type { TreeItem, TreeItemData } from './primitives/types.ts';

// Core components
export {
	TreeProvider,
	TreeBranch,
	TreeItem as TreeItemCore,
	TreeItemContext,
	useTreeBranch,
	type TreeProviderProps,
	type TreeBranchProps,
	type TreeItemProps,
	type TreeItemRenderProps,
} from './core/index.ts';

// High-level component
export { Tree, DropIndicator, type TreeProps, type Instruction } from './components/tree.tsx';
