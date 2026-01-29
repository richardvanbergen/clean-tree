import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import type { Instruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item";
import {
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import {
	TreeBranch,
	TreeContext,
	TreeItem,
	type TreeItemRenderProps,
	TreeProvider,
} from "../core/index.ts";
import type {
	TreeItemData,
	TreeItem as TreeItemType,
} from "../primitives/types.ts";

/**
 * Flatten nested TreeItemData into a Map of branchId -> TreeItem[].
 * Each branch's items are the direct children (without nested children).
 */
function flattenTreeData(
	items: TreeItemData[],
): Map<string | null, TreeItemType[]> {
	const branchMap = new Map<string | null, TreeItemType[]>();

	function traverse(items: TreeItemData[], parentId: string | null) {
		branchMap.set(
			parentId,
			items.map(({ children, ...item }) => item as TreeItemType),
		);

		for (const item of items) {
			if (item.children && item.children.length > 0) {
				traverse(item.children, item.id);
			}
		}
	}

	traverse(items, null);
	return branchMap;
}

export type TreeProps = {
	items: TreeItemData[];
	renderItem: (props: TreeItemRenderProps) => ReactNode;
	renderDragPreview?: (item: TreeItemType) => ReactNode;
	renderDropZoneIndicator?: (isDraggedOver: boolean) => ReactNode;
	onItemMoved?: (element: HTMLElement) => void;
	indentPerLevel?: number;
};

/**
 * Invisible drop target at the very end of the root list.
 * Allows dropping an item to append it at root level when
 * the last visible item is deeply nested.
 */
function RootEndDropZone({
	itemCount,
	renderIndicator,
}: {
	itemCount: number;
	renderIndicator?: (isDraggedOver: boolean) => ReactNode;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const [isDraggedOver, setIsDraggedOver] = useState(false);
	const { uniqueContextId, findItemBranch, getItem, dispatchEvent } =
		useContext(TreeContext);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;

		return dropTargetForElements({
			element,
			canDrop: ({ source }) => {
				return (
					source.data.type === "tree-item" &&
					source.data.uniqueContextId === uniqueContextId
				);
			},
			onDragEnter: () => setIsDraggedOver(true),
			onDrag: () => setIsDraggedOver(true),
			onDragLeave: () => setIsDraggedOver(false),
			onDrop: ({ source }) => {
				setIsDraggedOver(false);

				const draggedItemId = source.data.id as string;
				const sourceBranchId = findItemBranch(draggedItemId);
				if (sourceBranchId === undefined) return;

				const draggedItem = getItem(draggedItemId);
				if (!draggedItem) return;

				dispatchEvent({
					type: "item-drop-requested",
					payload: {
						itemId: draggedItemId,
						item: draggedItem,
						sourceBranchId,
						targetBranchId: null,
						targetIndex: itemCount,
						instruction: { type: "reorder-above" } as Instruction,
					},
				});
			},
		});
	}, [uniqueContextId, itemCount, findItemBranch, getItem, dispatchEvent]);

	return (
		<div
			ref={ref}
			style={{
				height: 8,
				position: "relative",
			}}
		>
			{renderIndicator?.(isDraggedOver)}
		</div>
	);
}

function RecursiveItem({
	item,
	level,
	index,
	renderItem,
	renderDragPreview,
	indentPerLevel,
}: {
	item: TreeItemType;
	level: number;
	index: number;
	renderItem: (props: TreeItemRenderProps) => ReactNode;
	renderDragPreview?: (item: TreeItemType) => ReactNode;
	indentPerLevel: number;
}) {
	return (
		<>
			<TreeItem
				item={item}
				level={level}
				index={index}
				indentPerLevel={indentPerLevel}
				renderDragPreview={renderDragPreview}
			>
				{(props) => renderItem(props)}
			</TreeItem>
			{item.isOpen && (
				<TreeBranch id={item.id}>
					{(children) =>
						children.map((child, i) => (
							<RecursiveItem
								key={child.id}
								item={child}
								level={level + 1}
								index={i}
								renderItem={renderItem}
								renderDragPreview={renderDragPreview}
								indentPerLevel={indentPerLevel}
							/>
						))
					}
				</TreeBranch>
			)}
		</>
	);
}

export function Tree({
	items,
	renderItem,
	renderDragPreview,
	renderDropZoneIndicator,
	onItemMoved,
	indentPerLevel = 20,
}: TreeProps) {
	const initialBranchData = useMemo(() => flattenTreeData(items), [items]);

	return (
		<TreeProvider
			initialBranchData={initialBranchData}
			onItemMoved={onItemMoved}
		>
			<TreeBranch id={null}>
				{(rootItems) => (
					<>
						{rootItems.map((item, index) => (
							<RecursiveItem
								key={item.id}
								item={item}
								level={0}
								index={index}
								renderItem={renderItem}
								renderDragPreview={renderDragPreview}
								indentPerLevel={indentPerLevel}
							/>
						))}
						<RootEndDropZone
							itemCount={rootItems.length}
							renderIndicator={renderDropZoneIndicator}
						/>
					</>
				)}
			</TreeBranch>
		</TreeProvider>
	);
}

export type { Instruction };
