import { createContext } from 'react';
import {
	attachInstruction,
	extractInstruction,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/tree-item';

import type { TreeEventType } from './tree-root-context.tsx';
import type { TreeItem } from '../primitives/types.ts';

export type TreeContextValue = {
	uniqueContextId: symbol;
	getPathToItem: (itemId: string) => string[];
	findItemBranch: (itemId: string) => string | null | undefined;
	getItem: (itemId: string) => TreeItem | undefined;
	itemHasChildren: (itemId: string) => boolean;
	dispatchEvent: (event: TreeEventType) => void;
	registerTreeItem: (args: {
		itemId: string;
		element: HTMLElement;
		actionMenuTrigger: HTMLElement;
	}) => () => void;
};

export const TreeContext = createContext<TreeContextValue>({
	uniqueContextId: Symbol('uniqueId'),
	getPathToItem: () => [],
	findItemBranch: () => undefined,
	getItem: () => undefined,
	itemHasChildren: () => false,
	dispatchEvent: () => {},
	registerTreeItem: () => () => {},
});

export type DependencyContextValue = {
	DropIndicator: typeof DropIndicator;
	attachInstruction: typeof attachInstruction;
	extractInstruction: typeof extractInstruction;
};

export const DependencyContext = createContext<DependencyContextValue>({
	DropIndicator: DropIndicator,
	attachInstruction: attachInstruction,
	extractInstruction: extractInstruction,
});
