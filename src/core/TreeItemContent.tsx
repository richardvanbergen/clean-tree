import React, { useContext, type ReactNode, type ButtonHTMLAttributes } from 'react';
import invariant from 'tiny-invariant';
import { TreeItemContext } from './TreeItem.tsx';
import { DependencyContext } from './contexts.ts';

export type TreeItemContentProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
	children: ReactNode;
};

export function TreeItemContent({ children, onClick, ...props }: TreeItemContentProps) {
	const context = useContext(TreeItemContext);
	invariant(context, 'TreeItemContent must be used within a TreeItem');

	const { DropIndicator } = useContext(DependencyContext);
	const { item, level, index, state, instruction, toggleOpen, buttonRef } = context;

	const aria = (() => {
		if (!item.children.length) {
			return undefined;
		}
		return {
			'aria-expanded': item.isOpen,
			'aria-controls': `tree-item-${item.id}--subtree`,
		};
	})();

	return (
		<button
			{...aria}
			{...props}
			id={`tree-item-${item.id}`}
			onClick={(e) => {
				toggleOpen();
				onClick?.(e);
			}}
			ref={buttonRef}
			type="button"
			data-index={index}
			data-level={level}
			data-testid={`tree-item-${item.id}`}
			data-state={state}
		>
			{children}
			{instruction ? <DropIndicator instruction={instruction} /> : null}
		</button>
	);
}
