import React, { useContext, useEffect, useRef, type ReactNode, type HTMLAttributes, forwardRef } from 'react';
import invariant from 'tiny-invariant';
import { TreeItemContext } from './tree-item.tsx';

export type TreeItemTriggerProps = HTMLAttributes<HTMLDivElement> & {
	children?: ReactNode;
};

export const TreeItemTrigger = forwardRef<HTMLDivElement, TreeItemTriggerProps>(
	function TreeItemTrigger({ children, ...props }, forwardedRef) {
		const context = useContext(TreeItemContext);
		invariant(context, 'TreeItemTrigger must be used within a TreeItem');

		const { actionMenuTriggerRef } = context;
		const divRef = useRef<HTMLDivElement>(null);

		// Set the actionMenuTriggerRef to this div (or first focusable child)
		useEffect(() => {
			if (divRef.current) {
				const focusable = divRef.current.querySelector('button, [tabindex]') as HTMLElement | null;
				(actionMenuTriggerRef as React.MutableRefObject<HTMLElement | null>).current = focusable ?? divRef.current;
			}
		}, [actionMenuTriggerRef]);

		return (
			<div
				{...props}
				ref={(el) => {
					(divRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
					if (typeof forwardedRef === 'function') {
						forwardedRef(el);
					} else if (forwardedRef) {
						forwardedRef.current = el;
					}
				}}
			>
				{children}
			</div>
		);
	},
);
