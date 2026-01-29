import { triggerPostMoveFlash } from "@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash";
import { DropIndicator } from "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/tree-item";
import { useState } from "react";
import {
	Tree,
	type TreeItem,
	type TreeItemData,
	type TreeItemRenderProps,
} from "../src/index.ts";
import "./styles.css";

const initialData: TreeItemData[] = [
	{
		id: "1",
		isFolder: true,
		isOpen: true,
		children: [
			{
				id: "1.1",
				isFolder: true,
				isOpen: true,
				children: [{ id: "1.1.1" }],
			},
			{ id: "1.2" },
		],
	},
	{
		id: "2",
		isFolder: true,
		isOpen: true,
		children: [],
	},
	{ id: "3" },
	{ id: "4" },
	{ id: "5" },
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
				transition: "transform 0.1s",
				transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
			}}
		>
			<path d="M10 6L16 12L10 18V6Z" />
		</svg>
	);
}

function FolderIcon({ isOpen }: { isOpen: boolean }) {
	if (isOpen) {
		return (
			<svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
				<path d="M20 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h10a2 2 0 0 1 2 2v1H11.5l-2 2H4v5l1.5-6h17l-2 8h-.5Z" />
			</svg>
		);
	}
	return (
		<svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
			<path d="M20 18H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4l2 2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2Z" />
		</svg>
	);
}

function FileIcon() {
	return (
		<svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm4 18H6V4h7v5h5v11Z" />
		</svg>
	);
}

function renderTreeItem({
	item,
	level,
	state,
	instruction,
	isOpen,
	isFolder,
	hasChildren,
	toggleOpen,
}: TreeItemRenderProps) {
	const isClickable = isFolder && hasChildren;
	return (
		<div style={{ position: "relative" }}>
			{/* Drop indicator */}
			{instruction && <DropIndicator instruction={instruction} />}

			{/* Item row */}
			<div
				onClick={isClickable ? toggleOpen : undefined}
				style={{
					display: "flex",
					alignItems: "center",
					gap: 4,
					padding: "6px 8px",
					paddingLeft: 8 + level * INDENT_PER_LEVEL,
					cursor: isClickable ? "pointer" : "default",
					background: state === "dragging" ? "#f0f0f0" : "transparent",
					opacity: state === "dragging" ? 0.5 : 1,
					borderRadius: 4,
					userSelect: "none",
				}}
			>
				{/* Expand/collapse arrow */}
				<span style={{ width: 16, display: "flex", justifyContent: "center" }}>
					{isFolder && hasChildren && <ChevronIcon isOpen={isOpen} />}
				</span>

				{/* Icon */}
				<span style={{ display: "flex", alignItems: "center", color: isFolder ? "#e8a838" : "#888" }}>
					{isFolder ? <FolderIcon isOpen={isOpen && hasChildren} /> : <FileIcon />}
				</span>

				{/* Item label */}
				<span>Item {item.id}</span>
			</div>
		</div>
	);
}

function renderDragPreview(item: TreeItem) {
	return (
		<div
			style={{
				padding: "4px 8px",
				background: "#fff",
				borderRadius: 3,
				boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
				fontSize: 14,
			}}
		>
			{item.id}
		</div>
	);
}

function renderDropZoneIndicator(isDraggedOver: boolean) {
	if (!isDraggedOver) return null;
	return (
		<div
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				right: 0,
				height: 2,
				background: "var(--ds-border-brand, #0052CC)",
				borderRadius: 1,
			}}
		/>
	);
}

export default function App() {
	const [items] = useState(initialData);

	return (
		<div style={{ padding: 20, fontFamily: "system-ui, sans-serif" }}>
			<h1>Tree Demo</h1>
			<p>
				Drag items to reorder. Drop on items to nest. Hover over collapsed items
				while dragging to expand.
			</p>

			<div
				style={{
					maxWidth: 400,
					border: "1px solid #ddd",
					borderRadius: 8,
					padding: 8,
				}}
			>
				<Tree
					items={items}
					renderItem={renderTreeItem}
					renderDragPreview={renderDragPreview}
					renderDropZoneIndicator={renderDropZoneIndicator}
					onItemMoved={triggerPostMoveFlash}
					indentPerLevel={INDENT_PER_LEVEL}
				/>
			</div>
		</div>
	);
}
