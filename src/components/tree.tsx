import React, { type ReactNode, type CSSProperties } from 'react';
import {
	TreeProvider,
	TreeRoot,
	TreeItem,
	TreeItemContent,
	TreeItemTrigger,
	TreeItemChildren,
} from '../core/index.ts';
import type { TreeItem as TreeItemType } from '../primitives/types.ts';

export type TreeProps = {
	items: TreeItemType[];
	onItemsChange?: (items: TreeItemType[]) => void;
	renderItem?: (item: TreeItemType, level: number) => ReactNode;
	renderIcon?: (item: TreeItemType) => ReactNode;
	renderActions?: (item: TreeItemType, openMoveDialog: () => void) => ReactNode;
	renderPreview?: (item: TreeItemType) => ReactNode;
	className?: string;
	style?: CSSProperties;
	itemClassName?: string;
	itemStyle?: CSSProperties | ((item: TreeItemType, level: number) => CSSProperties);
	contentClassName?: string;
	contentStyle?: CSSProperties | ((item: TreeItemType, level: number) => CSSProperties);
	childrenClassName?: string;
	childrenStyle?: CSSProperties | ((item: TreeItemType, level: number) => CSSProperties);
	indentPerLevel?: number;
};

function DefaultIcon({ item }: { item: TreeItemType }) {
	if (!item.children.length) {
		return (
			<svg width={24} height={24} viewBox="0 0 24 24" aria-hidden>
				<circle cx={12} cy={12} r={2} fill="currentColor" />
			</svg>
		);
	}
	return item.isOpen ? (
		<svg width={24} height={24} viewBox="0 0 24 24" aria-hidden>
			<path fill="currentColor" d="M7 10l5 5 5-5H7z" />
		</svg>
	) : (
		<svg width={24} height={24} viewBox="0 0 24 24" aria-hidden>
			<path fill="currentColor" d="M10 7l5 5-5 5V7z" />
		</svg>
	);
}

function RecursiveTreeItem({
	item,
	level,
	index,
	renderItem,
	renderIcon,
	renderActions,
	renderPreview,
	itemClassName,
	itemStyle,
	contentClassName,
	contentStyle,
	childrenClassName,
	childrenStyle,
	indentPerLevel,
}: {
	item: TreeItemType;
	level: number;
	index: number;
	renderItem?: (item: TreeItemType, level: number) => ReactNode;
	renderIcon?: (item: TreeItemType) => ReactNode;
	renderActions?: (item: TreeItemType, openMoveDialog: () => void) => ReactNode;
	renderPreview?: (item: TreeItemType) => ReactNode;
	itemClassName?: string;
	itemStyle?: CSSProperties | ((item: TreeItemType, level: number) => CSSProperties);
	contentClassName?: string;
	contentStyle?: CSSProperties | ((item: TreeItemType, level: number) => CSSProperties);
	childrenClassName?: string;
	childrenStyle?: CSSProperties | ((item: TreeItemType, level: number) => CSSProperties);
	indentPerLevel?: number;
}) {
	const computedItemStyle = typeof itemStyle === 'function' ? itemStyle(item, level) : itemStyle;
	const computedContentStyle = typeof contentStyle === 'function' ? contentStyle(item, level) : contentStyle;
	const computedChildrenStyle = typeof childrenStyle === 'function' ? childrenStyle(item, level) : childrenStyle;

	return (
		<TreeItem
			item={item}
			level={level}
			index={index}
			className={itemClassName}
			style={computedItemStyle}
			renderPreview={renderPreview}
		>
			{({ openMoveDialog, state }) => (
				<>
					<TreeItemContent
						className={contentClassName}
						style={computedContentStyle}
					>
						<span style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
							{renderIcon ? renderIcon(item) : <DefaultIcon item={item} />}
							<span style={{ flex: 1, opacity: state === 'dragging' ? 0.4 : 1 }}>
								{renderItem ? renderItem(item, level) : `Item ${item.id}`}
							</span>
						</span>
					</TreeItemContent>
					{renderActions && (
						<TreeItemTrigger style={{ position: 'absolute', top: 8, right: 8 }}>
							{renderActions(item, openMoveDialog)}
						</TreeItemTrigger>
					)}
					{!renderActions && (
						<TreeItemTrigger style={{ display: 'none' }} />
					)}
					<TreeItemChildren
						className={childrenClassName}
						style={{
							paddingLeft: indentPerLevel ?? 20,
							...computedChildrenStyle,
						}}
					>
						{item.children.map((child, i) => (
							<RecursiveTreeItem
								key={child.id}
								item={child}
								level={level + 1}
								index={i}
								renderItem={renderItem}
								renderIcon={renderIcon}
								renderActions={renderActions}
								renderPreview={renderPreview}
								itemClassName={itemClassName}
								itemStyle={itemStyle}
								contentClassName={contentClassName}
								contentStyle={contentStyle}
								childrenClassName={childrenClassName}
								childrenStyle={childrenStyle}
								indentPerLevel={indentPerLevel}
							/>
						))}
					</TreeItemChildren>
				</>
			)}
		</TreeItem>
	);
}

export function Tree({
	items,
	onItemsChange,
	renderItem,
	renderIcon,
	renderActions,
	renderPreview,
	className,
	style,
	itemClassName,
	itemStyle,
	contentClassName,
	contentStyle,
	childrenClassName,
	childrenStyle,
	indentPerLevel = 20,
}: TreeProps) {
	return (
		<TreeProvider items={items} onItemsChange={onItemsChange}>
			<TreeRoot className={className} style={style}>
				{items.map((item, index) => (
					<RecursiveTreeItem
						key={item.id}
						item={item}
						level={0}
						index={index}
						renderItem={renderItem}
						renderIcon={renderIcon}
						renderActions={renderActions}
						renderPreview={renderPreview}
						itemClassName={itemClassName}
						itemStyle={itemStyle}
						contentClassName={contentClassName}
						contentStyle={contentStyle}
						childrenClassName={childrenClassName}
						childrenStyle={childrenStyle}
						indentPerLevel={indentPerLevel}
					/>
				))}
			</TreeRoot>
		</TreeProvider>
	);
}
