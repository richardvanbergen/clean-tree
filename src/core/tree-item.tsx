import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
	draggable,
	dropTargetForElements,
	type ElementDropTargetEventBasePayload,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { pointerOutsideOfPreview } from "@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import type { Instruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item";
import React, {
	createContext,
	type HTMLAttributes,
	memo,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createRoot } from "react-dom/client";
import invariant from "tiny-invariant";
import type { TreeItem as TreeItemType } from "../primitives/types.ts";
import {
	DependencyContext,
	type DependencyContextValue,
	TreeContext,
	type TreeContextValue,
} from "./contexts.ts";
import {
	TreeBranchContext,
	type TreeBranchContextValue,
} from "./tree-branch.tsx";

export type TreeItemState = "idle" | "dragging";

export type TreeItemContextValue = {
	item: TreeItemType;
	level: number;
	state: TreeItemState;
	instruction: Instruction | null;
	isOpen: boolean;
	isFolder: boolean;
	hasChildren: boolean;
	toggleOpen: () => void;
	dragHandleRef: React.RefObject<HTMLElement | null>;
};

export const TreeItemContext = createContext<TreeItemContextValue | null>(null);

function delay({ waitMs, fn }: { waitMs: number; fn: () => void }): () => void {
	let timeoutId: ReturnType<typeof setTimeout> | null = setTimeout(() => {
		timeoutId = null;
		fn();
	}, waitMs);
	return function cancel() {
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	};
}

export type TreeItemRenderProps = {
	item: TreeItemType;
	level: number;
	state: TreeItemState;
	instruction: Instruction | null;
	isOpen: boolean;
	isFolder: boolean;
	hasChildren: boolean;
	toggleOpen: () => void;
	dragHandleRef: React.RefObject<HTMLElement | null>;
};

export type TreeItemProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
	item: TreeItemType;
	level: number;
	index: number;
	indentPerLevel?: number;
	renderDragPreview?: (item: TreeItemType) => ReactNode;
	children: (props: TreeItemRenderProps) => ReactNode;
};

function useChildrenTracking(
	itemId: string,
	itemHasChildren: (id: string) => boolean,
	addEventListener: TreeContextValue["addEventListener"],
	branchContext: TreeBranchContextValue | null,
) {
	const [hasChildren, setHasChildren] = useState(() => itemHasChildren(itemId));

	useEffect(() => {
		setHasChildren(itemHasChildren(itemId));

		return addEventListener((event) => {
			if (
				event.type === "branch-children-changed" &&
				event.payload.branchId === itemId
			) {
				setHasChildren(event.payload.hasChildren);
				if (!event.payload.hasChildren && branchContext) {
					branchContext.collapseItem(itemId);
				}
			}
		});
	}, [itemId, itemHasChildren, addEventListener, branchContext]);

	return hasChildren;
}

function useTreeItemRegistration(
	itemId: string,
	elementRef: React.RefObject<HTMLDivElement | null>,
	registerTreeItem: (args: {
		itemId: string;
		element: HTMLElement;
		actionMenuTrigger: HTMLElement;
	}) => () => void,
) {
	useEffect(() => {
		const element = elementRef.current;
		if (!element) return;
		return registerTreeItem({
			itemId,
			element,
			actionMenuTrigger: element,
		});
	}, [itemId, elementRef, registerTreeItem]);
}

function useTreeItemDragAndDrop({
	item,
	index,
	level,
	indentPerLevel,
	isOpen,
	hasChildren,
	expandItem,
	rowRef,
	uniqueContextId,
	extractInstruction,
	attachInstruction,
	getPathToItem,
	findItemBranch,
	getItem,
	dispatchEvent,
	branchContext,
	renderDragPreview,
}: {
	item: TreeItemType;
	index: number;
	level: number;
	indentPerLevel: number;
	isOpen: boolean;
	hasChildren: boolean;
	expandItem: () => void;
	rowRef: React.RefObject<HTMLDivElement | null>;
	uniqueContextId: TreeContextValue["uniqueContextId"];
	extractInstruction: DependencyContextValue["extractInstruction"];
	attachInstruction: DependencyContextValue["attachInstruction"];
	getPathToItem: TreeContextValue["getPathToItem"];
	findItemBranch: TreeContextValue["findItemBranch"];
	getItem: TreeContextValue["getItem"];
	dispatchEvent: TreeContextValue["dispatchEvent"];
	branchContext: TreeBranchContextValue | null;
	renderDragPreview?: (item: TreeItemType) => ReactNode;
}) {
	const dragHandleRef = useRef<HTMLElement>(null);
	const cancelExpandRef = useRef<(() => void) | null>(null);
	const [state, setState] = useState<TreeItemState>("idle");
	const [instruction, setInstruction] = useState<Instruction | null>(null);

	const cancelExpand = useCallback(() => {
		cancelExpandRef.current?.();
		cancelExpandRef.current = null;
	}, []);

	useEffect(() => {
		const element = rowRef.current;
		const dragHandle = dragHandleRef.current ?? element;
		invariant(element);
		invariant(dragHandle);

		function onChange({ self, location }: ElementDropTargetEventBasePayload) {
			const innerMost = location.current.dropTargets[0];
			if (innerMost?.element !== self.element) {
				setInstruction(null);
				return;
			}

			const instruction = extractInstruction(self.data) as Instruction | null;

			if (
				instruction?.type === "make-child" &&
				hasChildren &&
				!isOpen &&
				!cancelExpandRef.current
			) {
				cancelExpandRef.current = delay({
					waitMs: 500,
					fn: expandItem,
				});
			}
			if (instruction?.type !== "make-child" && cancelExpandRef.current) {
				cancelExpand();
			}

			setInstruction(instruction);
		}

		return combine(
			draggable({
				element: dragHandle,
				getInitialData: () => ({
					id: item.id,
					type: "tree-item",
					isOpenOnDragStart: isOpen,
					uniqueContextId,
				}),
				onGenerateDragPreview: renderDragPreview
					? ({ nativeSetDragImage }) => {
							setCustomNativeDragPreview({
								getOffset: pointerOutsideOfPreview({ x: "16px", y: "8px" }),
								render: ({ container }) => {
									const root = createRoot(container);
									root.render(renderDragPreview(item));
									return () => root.unmount();
								},
								nativeSetDragImage,
							});
						}
					: undefined,
				onDragStart: () => setState("dragging"),
				onDrop: () => setState("idle"),
			}),
			dropTargetForElements({
				element,
				getData: ({ input, element }) => {
					const data = { id: item.id, index };

					return attachInstruction(data, {
						input,
						element,
						indentPerLevel,
						currentLevel: level,
						mode: isOpen ? "expanded" : "standard",
						block: item.isFolder ? [] : ["make-child"],
					});
				},
				canDrop: ({ source }) => {
					if (source.data.type !== "tree-item") return false;
					if (source.data.id === item.id) return false;
					if (source.data.uniqueContextId !== uniqueContextId) return false;

					const pathToTarget = getPathToItem(item.id);
					const draggedId = source.data.id as string;
					if (pathToTarget.includes(draggedId)) return false;

					return true;
				},
				onDragEnter: onChange,
				onDrag: onChange,
				onDragLeave: () => {
					cancelExpand();
					setInstruction(null);
				},
				onDrop: (args) => {
					cancelExpand();
					setInstruction(null);

					const { source, location } = args;
					if (!location.current.dropTargets.length) return;

					const target = location.current.dropTargets[0];
					if (!target) return;

					const draggedItemId = source.data.id as string;
					const targetId = target.data.id as string;
					const targetIndex = target.data.index as number;
					const dropInstruction = extractInstruction(
						target.data,
					) as Instruction | null;

					if (!dropInstruction) return;

					const sourceBranchId = findItemBranch(draggedItemId);
					if (sourceBranchId === undefined) return;

					const draggedItem = getItem(draggedItemId);
					if (!draggedItem) return;

					let targetBranchId: string | null = null;
					let finalIndex = targetIndex;

					switch (dropInstruction.type) {
						case "reorder-above":
							targetBranchId = findItemBranch(targetId) ?? null;
							finalIndex = targetIndex;
							break;

						case "reorder-below":
							targetBranchId = findItemBranch(targetId) ?? null;
							finalIndex = targetIndex + 1;
							break;

						case "make-child":
							targetBranchId = targetId;
							finalIndex = 0;
							if (branchContext) {
								branchContext.expandItem(targetId);
							}
							break;

						case "reparent": {
							const path = getPathToItem(targetId);
							const ancestorId =
								dropInstruction.desiredLevel === 0
									? null
									: (path[dropInstruction.desiredLevel - 1] ?? null);
							targetBranchId = ancestorId;
							finalIndex = targetIndex + 1;
							break;
						}
					}

					if (targetBranchId === undefined) return;

					dispatchEvent({
						type: "item-drop-requested",
						payload: {
							itemId: draggedItemId,
							item: draggedItem,
							sourceBranchId,
							targetBranchId,
							targetIndex: finalIndex,
							instruction: dropInstruction,
						},
					});
				},
			}),
		);
	}, [
		item,
		index,
		level,
		indentPerLevel,
		isOpen,
		hasChildren,
		cancelExpand,
		expandItem,
		uniqueContextId,
		extractInstruction,
		attachInstruction,
		getPathToItem,
		findItemBranch,
		getItem,
		dispatchEvent,
		branchContext,
		renderDragPreview,
		rowRef,
	]);

	// Cleanup on unmount
	useEffect(() => {
		return () => cancelExpand();
	}, [cancelExpand]);

	return { state, instruction, dragHandleRef };
}

export const TreeItem = memo(function TreeItem({
	item,
	level,
	index,
	indentPerLevel = 20,
	renderDragPreview,
	children,
	...props
}: TreeItemProps) {
	const rowRef = useRef<HTMLDivElement>(null);

	const {
		uniqueContextId,
		registerTreeItem,
		getPathToItem,
		findItemBranch,
		getItem,
		itemHasChildren,
		addEventListener,
		dispatchEvent,
	} = useContext(TreeContext);
	const { attachInstruction, extractInstruction } =
		useContext(DependencyContext);
	const branchContext = useContext(TreeBranchContext);

	const isOpen = item.isOpen ?? false;
	const hasChildren = useChildrenTracking(
		item.id,
		itemHasChildren,
		addEventListener,
		branchContext,
	);

	useTreeItemRegistration(item.id, rowRef, registerTreeItem);

	const toggleOpen = useCallback(() => {
		if (branchContext) {
			branchContext.toggleItem(item.id);
		}
	}, [branchContext, item.id]);

	const expandItem = useCallback(() => {
		if (branchContext) {
			branchContext.expandItem(item.id);
		}
	}, [branchContext, item.id]);

	const { state, instruction, dragHandleRef } = useTreeItemDragAndDrop({
		item,
		index,
		level,
		indentPerLevel,
		isOpen,
		hasChildren,
		expandItem,
		rowRef,
		uniqueContextId,
		extractInstruction,
		attachInstruction,
		getPathToItem,
		findItemBranch,
		getItem,
		dispatchEvent,
		branchContext,
		renderDragPreview,
	});

	const contextValue = useMemo<TreeItemContextValue>(
		() => ({
			item,
			level,
			state,
			instruction,
			isOpen,
			isFolder: item.isFolder ?? false,
			hasChildren,
			toggleOpen,
			dragHandleRef,
		}),
		[
			item,
			level,
			state,
			instruction,
			isOpen,
			item.isFolder,
			hasChildren,
			toggleOpen,
			dragHandleRef,
		],
	);

	const renderProps: TreeItemRenderProps = {
		item,
		level,
		state,
		instruction,
		isOpen,
		isFolder: item.isFolder ?? false,
		hasChildren,
		toggleOpen,
		dragHandleRef,
	};

	return (
		<TreeItemContext.Provider value={contextValue}>
			<div
				ref={rowRef}
				data-tree-item
				data-item-id={item.id}
				data-level={level}
				{...props}
			>
				{children(renderProps)}
			</div>
		</TreeItemContext.Provider>
	);
});
