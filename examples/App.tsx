import React, { useState } from 'react';
import { Tree, DropIndicator, type TreeItemData, type TreeItemRenderProps, type Instruction } from '../src/index.ts';
import './styles.css';

const initialData: TreeItemData[] = [
	{
		id: '1',
		isOpen: true,
		children: [
			{
				id: '1.1',
				isOpen: true,
				children: [
					{ id: '1.1.1' },
					{ id: '1.1.2' },
				],
			},
			{ id: '1.2' },
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
					{ id: '2.1.1' },
					{ id: '2.1.2' },
				],
			},
		],
	},
	{ id: '3' },
];

const INDENT_PER_LEVEL = 20;

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
	return (
		<svg
			width={16}
			height={16}
			viewBox="0 0 24 24"
			fill="currentColor"
			style={{
				transition: 'transform 0.1s',
				transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
			}}
		>
			<path d="M10 6L16 12L10 18V6Z" />
		</svg>
	);
}

function renderTreeItem({ item, level, state, instruction, isOpen, hasChildren, toggleOpen }: TreeItemRenderProps) {
	return (
		<div style={{ position: 'relative' }}>
			{/* Drop indicator */}
			{instruction && <DropIndicator instruction={instruction} />}

			{/* Item row */}
			<div
				onClick={hasChildren ? toggleOpen : undefined}
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 4,
					padding: '6px 8px',
					paddingLeft: 8 + level * INDENT_PER_LEVEL,
					cursor: hasChildren ? 'pointer' : 'default',
					background: state === 'dragging' ? '#f0f0f0' : 'transparent',
					opacity: state === 'dragging' ? 0.5 : 1,
					borderRadius: 4,
					userSelect: 'none',
				}}
			>
				{/* Expand/collapse arrow */}
				<span style={{ width: 16, display: 'flex', justifyContent: 'center' }}>
					{hasChildren && <ChevronIcon isOpen={isOpen} />}
				</span>

				{/* Item label - customize this however you want */}
				<span>Item {item.id}</span>
			</div>
		</div>
	);
}

export default function App() {
	const [items] = useState(initialData);

	return (
		<div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>
			<h1>Tree Demo</h1>
			<p>Drag items to reorder. Drop on items to nest. Hover over collapsed items while dragging to expand.</p>

			<div style={{ maxWidth: 400, border: '1px solid #ddd', borderRadius: 8, padding: 8 }}>
				<Tree items={items} renderItem={renderTreeItem} indentPerLevel={INDENT_PER_LEVEL} />
			</div>
		</div>
	);
}
