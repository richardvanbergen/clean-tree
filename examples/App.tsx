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

/**
 * Fake async data source keyed by folder ID.
 * When a folder is expanded, its children are loaded from here.
 * Mutable so that onMoveItem can update it to simulate a server.
 */
const fakeChildrenMap: Record<string, TreeItem[]> = {
	"1": [{ id: "1.1", isFolder: true }, { id: "1.2" }],
	"1.1": [{ id: "1.1.1" }, { id: "1.1.2" }],
	"2": [{ id: "2.1" }, { id: "2.2", isFolder: true }, { id: "2.3" }],
	"2.2": [{ id: "2.2.1" }],
};

/** Root-level items, kept in sync with fakeChildrenMap[__root__] */
let fakeRootItems: TreeItem[] = [
	{ id: "1", isFolder: true },
	{ id: "2", isFolder: true },
	{ id: "3" },
	{ id: "4" },
	{ id: "5" },
];

function getFakeChildren(branchId: string | null): TreeItem[] {
	if (branchId === null) return fakeRootItems;
	return fakeChildrenMap[branchId] ?? [];
}

function setFakeChildren(branchId: string | null, items: TreeItem[]) {
	if (branchId === null) {
		fakeRootItems = items;
	} else {
		fakeChildrenMap[branchId] = items;
	}
}

async function loadChildren(parentId: string | null): Promise<TreeItem[]> {
	// Simulate network latency
	await new Promise((resolve) => setTimeout(resolve, 800));
	if (parentId === null) return [];
	return fakeChildrenMap[parentId] ?? [];
}

/**
 * Server-driven move callback.
 * Simulates latency, mutates the fake data source, and returns the
 * complete child list for the target branch.
 */
async function handleMoveItem(
	itemId: string,
	targetBranchId: string | null,
	targetIndex: number,
): Promise<TreeItem[]> {
	await new Promise((resolve) => setTimeout(resolve, 500));

	// Find and remove the item from its current branch
	let movedItem: TreeItem | undefined;
	const allBranchIds: (string | null)[] = [
		null,
		...Object.keys(fakeChildrenMap),
	];
	for (const branchId of allBranchIds) {
		const children = getFakeChildren(branchId);
		const idx = children.findIndex((i) => i.id === itemId);
		if (idx !== -1) {
			movedItem = children[idx];
			const updated = [...children];
			updated.splice(idx, 1);
			setFakeChildren(branchId, updated);
			break;
		}
	}

	if (!movedItem) return getFakeChildren(targetBranchId);

	// Insert into target branch at the requested index
	const targetChildren = [...getFakeChildren(targetBranchId)];
	const clampedIndex = Math.min(targetIndex, targetChildren.length);
	targetChildren.splice(clampedIndex, 0, movedItem);
	setFakeChildren(targetBranchId, targetChildren);

	return targetChildren;
}

/**
 * Initial tree data — folders start collapsed with no inline children.
 * Children are loaded asynchronously when a folder is expanded.
 */
const initialData: TreeItemData[] = [
	{ id: "1", isFolder: true },
	{ id: "2", isFolder: true },
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
	return (
		<div style={{ position: "relative" }}>
			{/* Drop indicator */}
			{instruction && <DropIndicator instruction={instruction} />}

			{/* Item row */}
			<div
				onClick={isFolder ? toggleOpen : undefined}
				style={{
					display: "flex",
					alignItems: "center",
					gap: 4,
					padding: "6px 8px",
					paddingLeft: 8 + level * INDENT_PER_LEVEL,
					cursor: isFolder ? "pointer" : "default",
					background: state === "dragging" ? "#f0f0f0" : "transparent",
					opacity: state === "dragging" ? 0.5 : 1,
					borderRadius: 4,
					userSelect: "none",
				}}
			>
				{/* Expand/collapse arrow */}
				<span style={{ width: 16, display: "flex", justifyContent: "center" }}>
					{isFolder && <ChevronIcon isOpen={isOpen} />}
				</span>

				{/* Icon */}
				<span
					style={{
						display: "flex",
						alignItems: "center",
						color: isFolder ? "#e8a838" : "#888",
					}}
				>
					{isFolder ? (
						<FolderIcon isOpen={isOpen && hasChildren} />
					) : (
						<FileIcon />
					)}
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

function renderLoading() {
	return (
		<div
			style={{
				padding: "6px 8px",
				paddingLeft: 48,
				color: "#999",
				fontSize: 13,
				fontStyle: "italic",
			}}
		>
			Loading...
		</div>
	);
}

export default function App() {
	const [items] = useState(initialData);

	return (
		<div style={{ padding: 20, fontFamily: "system-ui, sans-serif" }}>
			<h1>Tree Demo</h1>
			<p>
				Drag items to reorder. Drop on items to nest. Click folders to expand
				(children load asynchronously).
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
					loadChildren={loadChildren}
					onMoveItem={handleMoveItem}
					renderLoading={renderLoading}
				/>
			</div>
		</div>
	);
}
