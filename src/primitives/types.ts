import type { Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/list-item';

export type TreeItem = {
	id: string;
	isDraft?: boolean;
	children: TreeItem[];
	isOpen?: boolean;
};

export type TreeState = {
	lastAction: TreeAction | null;
	data: TreeItem[];
};

export type TreeAction =
	| {
			type: 'instruction';
			instruction: Instruction;
			itemId: string;
			targetId: string;
	  }
	| {
			type: 'toggle';
			itemId: string;
	  }
	| {
			type: 'expand';
			itemId: string;
	  }
	| {
			type: 'collapse';
			itemId: string;
	  }
	| { type: 'modal-move'; itemId: string; targetId: string; index: number };
