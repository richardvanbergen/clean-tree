import {
	attachInstruction,
	extractInstruction,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item";
import { createContext } from "react";
import type { TreeItem } from "../primitives/types.ts";
import type { TreeEventListener, TreeEventType } from "./tree-root-context.tsx";

export type TreeContextValue = {
	uniqueContextId: symbol;
	getPathToItem: (itemId: string) => string[];
	findItemBranch: (itemId: string) => string | null | undefined;
	getItem: (itemId: string) => TreeItem | undefined;
	itemHasChildren: (itemId: string) => boolean;
	dispatchEvent: (event: TreeEventType) => void;
	addEventListener: (listener: TreeEventListener) => () => void;
	registerTreeItem: (args: {
		itemId: string;
		element: HTMLElement;
		actionMenuTrigger: HTMLElement;
	}) => () => void;
};

export const TreeContext = createContext<TreeContextValue>({
	uniqueContextId: Symbol("uniqueId"),
	getPathToItem: () => [],
	findItemBranch: () => undefined,
	getItem: () => undefined,
	itemHasChildren: () => false,
	dispatchEvent: () => {},
	addEventListener: () => () => {},
	registerTreeItem: () => () => {},
});

export type DependencyContextValue = {
	attachInstruction: typeof attachInstruction;
	extractInstruction: typeof extractInstruction;
};

export const DependencyContext = createContext<DependencyContextValue>({
	attachInstruction: attachInstruction,
	extractInstruction: extractInstruction,
});
