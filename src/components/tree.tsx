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
	MoveItemArgs,
	MoveItemResult,
	TreeItemData,
	TreeItem as TreeItemType,
} from "../primitives/types.ts";

/**
 * Flatten nested TreeItemData into a Map of branchId -> TreeItem[].
 * Each branch's items are the direct children (without nested children).
 * Also extracts initial open state from TreeItemData.isOpen.
 */
function flattenTreeData(items: TreeItemData[]): {
	branchMap: Map<string | null, TreeItemType[]>;
	initialOpenState: Map<string, boolean>;
} {
	const branchMap = new Map<string | null, TreeItemType[]>();
	const initialOpenState = new Map<string, boolean>();

	function traverse(items: TreeItemData[], parentId: string | null) {
		branchMap.set(
			parentId,
			items.map(({ children, isOpen, ...item }) => item as TreeItemType),
		);

		for (const item of items) {
			if (item.isOpen !== undefined) {
				initialOpenState.set(item.id, item.isOpen);
			}
			if (item.children && item.children.length > 0) {
				traverse(item.children, item.id);
			}
		}
	}

	traverse(items, null);
	return { branchMap, initialOpenState };
}

export type TreeProps = {
	items: TreeItemData[];
	renderItem: (props: TreeItemRenderProps) => ReactNode;
	renderDragPreview?: (item: TreeItemType) => ReactNode;
	renderDropZoneIndicator?: (isDraggedOver: boolean) => ReactNode;
	onItemMoved?: (element: HTMLElement) => void;
	indentPerLevel?: number;
	loadChildren?: (parentId: string | null) => Promise<TreeItemType[]>;
	onMoveItem?: (args: MoveItemArgs) => Promise<MoveItemResult>;
	onCreateItem?: (
		parentBranchId: string | null,
		item: TreeItemType,
	) => Promise<TreeItemType[]>;
	onCreateFolder?: (
		parentBranchId: string | null,
		folder: TreeItemType,
	) => Promise<TreeItemType[]>;
	onDeleteItem?: (
		itemId: string,
		branchId: string | null,
	) => Promise<TreeItemType[]>;
	onDeleteFolder?: (
		folderId: string,
		branchId: string | null,
	) => Promise<TreeItemType[]>;
	renderLoading?: () => ReactNode;
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

function useIsItemOpen(itemId: string): boolean {
	const { isItemOpen, addEventListener } = useContext(TreeContext);
	const [open, setOpen] = useState(() => isItemOpen(itemId));

	useEffect(() => {
		return addEventListener((event) => {
			if (
				event.type === "open-state-changed" &&
				event.payload.itemId === itemId
			) {
				setOpen(event.payload.isOpen);
			}
		});
	}, [addEventListener, itemId]);

	return open;
}

function RecursiveItem({
	item,
	level,
	index,
	renderItem,
	renderDragPreview,
	indentPerLevel,
	loadChildren,
	onMoveItem,
	onCreateItem,
	onCreateFolder,
	onDeleteItem,
	onDeleteFolder,
	renderLoading,
}: {
	item: TreeItemType;
	level: number;
	index: number;
	renderItem: (props: TreeItemRenderProps) => ReactNode;
	renderDragPreview?: (item: TreeItemType) => ReactNode;
	indentPerLevel: number;
	loadChildren?: (parentId: string | null) => Promise<TreeItemType[]>;
	onMoveItem?: (args: MoveItemArgs) => Promise<MoveItemResult>;
	onCreateItem?: (
		parentBranchId: string | null,
		item: TreeItemType,
	) => Promise<TreeItemType[]>;
	onCreateFolder?: (
		parentBranchId: string | null,
		folder: TreeItemType,
	) => Promise<TreeItemType[]>;
	onDeleteItem?: (
		itemId: string,
		branchId: string | null,
	) => Promise<TreeItemType[]>;
	onDeleteFolder?: (
		folderId: string,
		branchId: string | null,
	) => Promise<TreeItemType[]>;
	renderLoading?: () => ReactNode;
}) {
	const isOpen = useIsItemOpen(item.id);

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
			{isOpen && (
				<TreeBranch
					id={item.id}
					loadChildren={loadChildren}
					onMoveItem={onMoveItem}
					onCreateItem={onCreateItem}
					onCreateFolder={onCreateFolder}
					onDeleteItem={onDeleteItem}
					onDeleteFolder={onDeleteFolder}
				>
					{(children, isLoading) => (
						<>
							{children.map((child, i) => (
								<RecursiveItem
									key={child.id}
									item={child}
									level={level + 1}
									index={i}
									renderItem={renderItem}
									renderDragPreview={renderDragPreview}
									indentPerLevel={indentPerLevel}
									loadChildren={loadChildren}
									onMoveItem={onMoveItem}
									onCreateItem={onCreateItem}
									onCreateFolder={onCreateFolder}
									onDeleteItem={onDeleteItem}
									onDeleteFolder={onDeleteFolder}
									renderLoading={renderLoading}
								/>
							))}
							{isLoading && renderLoading?.()}
						</>
					)}
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
	loadChildren,
	onMoveItem,
	onCreateItem,
	onCreateFolder,
	onDeleteItem,
	onDeleteFolder,
	renderLoading,
}: TreeProps) {
	const { branchMap, initialOpenState } = useMemo(
		() => flattenTreeData(items),
		[items],
	);

	return (
		<TreeProvider
			initialBranchData={branchMap}
			initialOpenState={initialOpenState}
			onItemMoved={onItemMoved}
		>
			<TreeBranch
				id={null}
				loadChildren={loadChildren}
				onMoveItem={onMoveItem}
				onCreateItem={onCreateItem}
				onCreateFolder={onCreateFolder}
				onDeleteItem={onDeleteItem}
				onDeleteFolder={onDeleteFolder}
			>
				{(rootItems, isLoading) => (
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
								loadChildren={loadChildren}
								onMoveItem={onMoveItem}
								onCreateItem={onCreateItem}
								onCreateFolder={onCreateFolder}
								onDeleteItem={onDeleteItem}
								onDeleteFolder={onDeleteFolder}
								renderLoading={renderLoading}
							/>
						))}
						{isLoading && renderLoading?.()}
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
