import React, { useState } from 'react';
import { Tree, type TreeItem } from '../src/index.ts';
import { MoveDialog } from '../src/components/MoveDialog.tsx';
import { TreeProvider, TreeRoot, TreeItem as TreeItemCore, TreeItemContent, TreeItemTrigger, TreeItemChildren } from '../src/core/index.ts';
import './styles.css';

const initialData: TreeItem[] = [
	{
		id: '1',
		isOpen: true,
		children: [
			{
				id: '1.1',
				isOpen: true,
				children: [
					{ id: '1.1.1', children: [] },
					{ id: '1.1.2', isDraft: true, children: [] },
				],
			},
			{ id: '1.2', children: [] },
		],
	},
	{
		id: '2',
		isOpen: true,
		children: [
			{
				id: '2.1',
				isOpen: true,
				children: [
					{ id: '2.1.1', children: [] },
					{ id: '2.1.2', children: [] },
				],
			},
		],
	},
];

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
	return isOpen ? (
		<svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
			<path d="M7 10l5 5 5-5H7z" />
		</svg>
	) : (
		<svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
			<path d="M10 7l5 5-5 5V7z" />
		</svg>
	);
}

function DotIcon() {
	return (
		<svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
			<circle cx={12} cy={12} r={3} />
		</svg>
	);
}

function MoreIcon() {
	return (
		<svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
			<circle cx={6} cy={12} r={2} />
			<circle cx={12} cy={12} r={2} />
			<circle cx={18} cy={12} r={2} />
		</svg>
	);
}

export default function App() {
	const [items, setItems] = useState(initialData);
	const [moveDialogItem, setMoveDialogItem] = useState<string | null>(null);

	return (
		<div className="app">
			<h1>Clean Tree Demo</h1>

			<section>
				<h2>Simple Usage (High-Level API)</h2>
				<p>Just pass items and onItemsChange - drag and drop works automatically.</p>

				<div className="tree-container">
					<Tree
						items={items}
						onItemsChange={setItems}
						className="tree"
						contentClassName="tree-item-content"
						childrenClassName="tree-item-children"
						renderItem={(item) => (
							<span>
								{item.id} {item.isDraft && <span className="draft-badge">Draft</span>}
							</span>
						)}
						renderIcon={(item) =>
							item.children.length > 0 ? (
								<ChevronIcon isOpen={item.isOpen ?? false} />
							) : (
								<DotIcon />
							)
						}
						renderActions={(item, openMoveDialog) => (
							<button
								className="action-button"
								onClick={(e) => {
									e.stopPropagation();
									openMoveDialog();
								}}
							>
								<MoreIcon />
							</button>
						)}
					/>
				</div>
			</section>

			<section>
				<h2>Composed Usage (Full Control)</h2>
				<p>Use individual components for complete customization.</p>

				<div className="tree-container">
					<TreeProvider items={items} onItemsChange={setItems}>
						<TreeRoot className="tree">
							{items.map((item, index) => (
								<ComposedTreeItem
									key={item.id}
									item={item}
									level={0}
									index={index}
									onOpenMoveDialog={setMoveDialogItem}
								/>
							))}
						</TreeRoot>
						{moveDialogItem && (
							<MoveDialog
								itemId={moveDialogItem}
								open={!!moveDialogItem}
								onOpenChange={(open) => !open && setMoveDialogItem(null)}
							/>
						)}
					</TreeProvider>
				</div>
			</section>
		</div>
	);
}

function ComposedTreeItem({
	item,
	level,
	index,
	onOpenMoveDialog,
}: {
	item: TreeItem;
	level: number;
	index: number;
	onOpenMoveDialog: (itemId: string) => void;
}) {
	return (
		<TreeItemCore item={item} level={level} index={index}>
			{({ state, openMoveDialog }) => (
				<>
					<TreeItemContent
						className="tree-item-content"
						style={{ opacity: state === 'dragging' ? 0.4 : 1 }}
					>
						<span className="tree-item-icon">
							{item.children.length > 0 ? (
								<ChevronIcon isOpen={item.isOpen ?? false} />
							) : (
								<DotIcon />
							)}
						</span>
						<span className="tree-item-label">
							{item.id} {item.isDraft && <span className="draft-badge">Draft</span>}
						</span>
					</TreeItemContent>
					<TreeItemTrigger
						className="action-button composed-action"
						onClick={(e) => {
							e.stopPropagation();
							onOpenMoveDialog(item.id);
						}}
					>
						<MoreIcon />
					</TreeItemTrigger>
					<TreeItemChildren className="tree-item-children">
						{item.children.map((child, i) => (
							<ComposedTreeItem
								key={child.id}
								item={child}
								level={level + 1}
								index={i}
								onOpenMoveDialog={onOpenMoveDialog}
							/>
						))}
					</TreeItemChildren>
				</>
			)}
		</TreeItemCore>
	);
}
