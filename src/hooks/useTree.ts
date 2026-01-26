import { useContext } from 'react';
import { TreeContext } from '../core/contexts.ts';

export function useTree() {
	const context = useContext(TreeContext);
	return {
		dispatch: context.dispatch,
		getPathToItem: context.getPathToItem,
		getMoveTargets: context.getMoveTargets,
		getChildrenOfItem: context.getChildrenOfItem,
	};
}
