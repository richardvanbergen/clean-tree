import memoizeOne from "memoize-one";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import type { TreeItem } from "../primitives/types.ts";
import { TreeContext, type TreeContextValue } from "./contexts.ts";
import { TreeRootProvider, useTreeRootContext } from "./tree-root-context.tsx";

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
	initialOpenState?: Map<string, boolean>;
	onItemMoved?: (element: HTMLElement) => void;
	onOpenStateChange?: (itemId: string, isOpen: boolean) => void;
	children: ReactNode;
};

function TreeProviderInner({
	onItemMoved,
	onOpenStateChange,
	children,
}: {
	onItemMoved?: (element: HTMLElement) => void;
	onOpenStateChange?: (itemId: string, isOpen: boolean) => void;
	children: ReactNode;
}) {
	const rootContext = useTreeRootContext();
	const [{ registry, registerTreeItem }] = useState(createTreeItemRegistry);

	// Listen for item-added events to notify via callback
	useEffect(() => {
		if (!onItemMoved) return;

		return rootContext.addEventListener((event) => {
			if (event.type === "item-added") {
				setTimeout(() => {
					const entry = registry.get(event.payload.itemId);
					if (entry?.element) {
						onItemMoved(entry.element);
					}
				});
			}
		});
	}, [rootContext, registry, onItemMoved]);

	// Listen for open-state-changed events to notify via callback
	useEffect(() => {
		if (!onOpenStateChange) return;

		return rootContext.addEventListener((event) => {
			if (event.type === "open-state-changed") {
				onOpenStateChange(event.payload.itemId, event.payload.isOpen);
			}
		});
	}, [rootContext, onOpenStateChange]);

	const context = useMemo<TreeContextValue>(
		() => ({
			uniqueContextId: rootContext.uniqueContextId,
			getPathToItem: memoizeOne((targetId: string) =>
				rootContext.getPathToItem(targetId),
			),
			findItemBranch: rootContext.findItemBranch,
			getItem: rootContext.getItem,
			itemHasChildren: rootContext.itemHasChildren,
			dispatchEvent: rootContext.dispatchEvent,
			addEventListener: rootContext.addEventListener,
			registerTreeItem,
			isItemOpen: rootContext.isItemOpen,
			setItemOpen: rootContext.setItemOpen,
			toggleItemOpen: rootContext.toggleItemOpen,
		}),
		[rootContext, registerTreeItem],
	);

	return (
		<TreeContext.Provider value={context}>{children}</TreeContext.Provider>
	);
}

export function TreeProvider({
	initialBranchData,
	initialOpenState,
	onItemMoved,
	onOpenStateChange,
	children,
}: TreeProviderProps) {
	return (
		<TreeRootProvider
			initialBranchData={initialBranchData}
			initialOpenState={initialOpenState}
		>
			<TreeProviderInner onItemMoved={onItemMoved} onOpenStateChange={onOpenStateChange}>
				{children}
			</TreeProviderInner>
		</TreeRootProvider>
	);
}
