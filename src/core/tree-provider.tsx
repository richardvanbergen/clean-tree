import React, {
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react';
import memoizeOne from 'memoize-one';
import { triggerPostMoveFlash } from '@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash';

import { TreeContext, type TreeContextValue } from './contexts.ts';
import { TreeRootProvider, useTreeRootContext } from './tree-root-context.tsx';
import type { TreeItem } from '../primitives/types.ts';

type CleanupFn = () => void;

function createTreeItemRegistry() {
	const registry = new Map<string, { element: HTMLElement }>();

	const registerTreeItem = ({
		itemId,
		element,
	}: {
		itemId: string;
		element: HTMLElement;
		actionMenuTrigger: HTMLElement;
	}): CleanupFn => {
		registry.set(itemId, { element });
		return () => {
			registry.delete(itemId);
		};
	};

	return { registry, registerTreeItem };
}

export type TreeProviderProps = {
	initialBranchData?: Map<string | null, TreeItem[]>;
	children: ReactNode;
};

function TreeProviderInner({ children }: { children: ReactNode }) {
	const rootContext = useTreeRootContext();
	const [{ registry, registerTreeItem }] = useState(createTreeItemRegistry);

	// Listen for item-added events to trigger post-move flash
	useEffect(() => {
		return rootContext.addEventListener((event) => {
			if (event.type === 'item-added') {
				setTimeout(() => {
					const entry = registry.get(event.payload.itemId);
					if (entry?.element) {
						triggerPostMoveFlash(entry.element);
					}
				});
			}
		});
	}, [rootContext, registry]);

	const context = useMemo<TreeContextValue>(
		() => ({
			uniqueContextId: rootContext.uniqueContextId,
			getPathToItem: memoizeOne(
				(targetId: string) => rootContext.getPathToItem(targetId),
			),
			findItemBranch: rootContext.findItemBranch,
			getItem: rootContext.getItem,
			itemHasChildren: rootContext.itemHasChildren,
			dispatchEvent: rootContext.dispatchEvent,
			registerTreeItem,
		}),
		[rootContext, registerTreeItem],
	);

	return <TreeContext.Provider value={context}>{children}</TreeContext.Provider>;
}

export function TreeProvider({ initialBranchData, children }: TreeProviderProps) {
	return (
		<TreeRootProvider initialBranchData={initialBranchData}>
			<TreeProviderInner>{children}</TreeProviderInner>
		</TreeRootProvider>
	);
}
