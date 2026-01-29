import React, { useMemo, type ReactNode } from 'react';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/tree-item';
import type { Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';

import {
	TreeProvider,
	TreeBranch,
	TreeItem,
	type TreeItemRenderProps,
} from '../core/index.ts';
import type { TreeItem as TreeItemType, TreeItemData } from '../primitives/types.ts';

/**
 * Flatten nested TreeItemData into a Map of branchId -> TreeItem[].
 * Each branch's items are the direct children (without nested children).
 */
function flattenTreeData(items: TreeItemData[]): Map<string | null, TreeItemType[]> {
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
	indentPerLevel?: number;
};

function RecursiveItem({
	item,
	level,
	index,
	renderItem,
	indentPerLevel,
}: {
	item: TreeItemType;
	level: number;
	index: number;
	renderItem: (props: TreeItemRenderProps) => ReactNode;
	indentPerLevel: number;
}) {
	return (
		<>
			<TreeItem item={item} level={level} index={index} indentPerLevel={indentPerLevel}>
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
								indentPerLevel={indentPerLevel}
							/>
						))
					}
				</TreeBranch>
			)}
		</>
	);
}

export function Tree({ items, renderItem, indentPerLevel = 20 }: TreeProps) {
	const initialBranchData = useMemo(() => flattenTreeData(items), [items]);

	return (
		<TreeProvider initialBranchData={initialBranchData}>
			<TreeBranch id={null}>
				{(rootItems) =>
					rootItems.map((item, index) => (
						<RecursiveItem
							key={item.id}
							item={item}
							level={0}
							index={index}
							renderItem={renderItem}
							indentPerLevel={indentPerLevel}
						/>
					))
				}
			</TreeBranch>
		</TreeProvider>
	);
}

// Re-export DropIndicator for use in custom renderItem
export { DropIndicator };
export type { Instruction };
