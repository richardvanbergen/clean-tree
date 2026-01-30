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
	// Documents
	documents: [
		{ id: "contracts", isFolder: true },
		{ id: "invoices", isFolder: true },
		{ id: "cover-letter.docx" },
		{ id: "resume-2025.pdf" },
		{ id: "tax-return-2024.pdf" },
		{ id: "meeting-notes.md" },
	],
	contracts: [
		{ id: "freelance-agreement.pdf" },
		{ id: "nda-acme-corp.pdf" },
		{ id: "lease-2024.pdf" },
	],
	invoices: [
		{ id: "inv-001.pdf" },
		{ id: "inv-002.pdf" },
		{ id: "inv-003.pdf" },
		{ id: "inv-004.pdf" },
	],

	// Projects
	projects: [
		{ id: "website-redesign", isFolder: true },
		{ id: "mobile-app", isFolder: true },
		{ id: "secret-side-project", isFolder: true },
		{ id: "project-ideas.txt" },
	],
	"website-redesign": [
		{ id: "wr-assets", isFolder: true },
		{ id: "wr-components", isFolder: true },
		{ id: "index.html" },
		{ id: "styles.css" },
		{ id: "app.tsx" },
		{ id: "README.md" },
	],
	"wr-assets": [
		{ id: "logo.svg" },
		{ id: "hero-banner.png" },
		{ id: "favicon.ico" },
		{ id: "og-image.jpg" },
	],
	"wr-components": [
		{ id: "Header.tsx" },
		{ id: "Footer.tsx" },
		{ id: "Sidebar.tsx" },
		{ id: "Button.tsx" },
		{ id: "Modal.tsx" },
	],
	"mobile-app": [
		{ id: "ma-screens", isFolder: true },
		{ id: "ma-utils", isFolder: true },
		{ id: "App.swift" },
		{ id: "Package.swift" },
	],
	"ma-screens": [
		{ id: "HomeScreen.swift" },
		{ id: "ProfileScreen.swift" },
		{ id: "SettingsScreen.swift" },
		{ id: "OnboardingScreen.swift" },
	],
	"ma-utils": [
		{ id: "NetworkManager.swift" },
		{ id: "CacheHelper.swift" },
		{ id: "Extensions.swift" },
	],
	"secret-side-project": [
		{ id: "ssp-experiments", isFolder: true },
		{ id: "brainstorm.md" },
		{ id: "prototype.py" },
		{ id: "data.json" },
	],
	"ssp-experiments": [
		{ id: "attempt-1.py" },
		{ id: "attempt-2.py" },
		{ id: "attempt-3.py" },
		{ id: "results.csv" },
	],

	// Photos
	photos: [
		{ id: "vacations", isFolder: true },
		{ id: "pets", isFolder: true },
		{ id: "screenshots", isFolder: true },
		{ id: "profile-pic.jpg" },
		{ id: "panorama-mountains.jpg" },
	],
	vacations: [
		{ id: "japan-2024", isFolder: true },
		{ id: "iceland-2023", isFolder: true },
		{ id: "beach-sunset.jpg" },
		{ id: "airport-selfie.jpg" },
	],
	"japan-2024": [
		{ id: "tokyo-tower.jpg" },
		{ id: "ramen-shop.jpg" },
		{ id: "shibuya-crossing.jpg" },
		{ id: "mt-fuji.jpg" },
		{ id: "temple-kyoto.jpg" },
	],
	"iceland-2023": [
		{ id: "northern-lights.jpg" },
		{ id: "geyser.jpg" },
		{ id: "black-sand-beach.jpg" },
	],
	pets: [
		{ id: "dog-park.jpg" },
		{ id: "cat-sleeping.jpg" },
		{ id: "fish-tank.mp4" },
		{ id: "parrot-talking.mp4" },
	],
	screenshots: [
		{ id: "bug-report-1.png" },
		{ id: "bug-report-2.png" },
		{ id: "high-score.png" },
		{ id: "funny-error.png" },
		{ id: "meme-template.png" },
	],

	// Music
	music: [
		{ id: "playlists", isFolder: true },
		{ id: "recordings", isFolder: true },
		{ id: "sample-beat.wav" },
	],
	playlists: [
		{ id: "chill-vibes.m3u" },
		{ id: "workout-bangers.m3u" },
		{ id: "coding-focus.m3u" },
		{ id: "90s-nostalgia.m3u" },
	],
	recordings: [
		{ id: "voice-memo-jan.m4a" },
		{ id: "guitar-riff.wav" },
		{ id: "podcast-draft.mp3" },
	],

	// Config
	config: [
		{ id: "dotfiles", isFolder: true },
		{ id: "ssh-keys", isFolder: true },
		{ id: "settings.json" },
		{ id: "preferences.yaml" },
	],
	dotfiles: [
		{ id: ".zshrc" },
		{ id: ".gitconfig" },
		{ id: ".vimrc" },
		{ id: ".tmux.conf" },
		{ id: ".prettierrc" },
		{ id: ".eslintrc.json" },
	],
	"ssh-keys": [
		{ id: "id_ed25519" },
		{ id: "id_ed25519.pub" },
		{ id: "known_hosts" },
	],

	// Downloads
	downloads: [
		{ id: "installers", isFolder: true },
		{ id: "random-pdf.pdf" },
		{ id: "mystery-file.zip" },
		{ id: "definitely-not-a-virus.exe" },
		{ id: "lecture-notes-week3.pdf" },
		{ id: "receipt-amazon.pdf" },
		{ id: "cat-video.mp4" },
	],
	installers: [
		{ id: "node-v22.pkg" },
		{ id: "docker-desktop.dmg" },
		{ id: "vscode-arm64.deb" },
	],
};

/** Root-level items, kept in sync with fakeChildrenMap[__root__] */
let fakeRootItems: TreeItem[] = [
	{ id: "documents", isFolder: true },
	{ id: "projects", isFolder: true },
	{ id: "photos", isFolder: true },
	{ id: "music", isFolder: true },
	{ id: "config", isFolder: true },
	{ id: "downloads", isFolder: true },
	{ id: "todo.txt" },
	{ id: "scratch.md" },
	{ id: "passwords-DO-NOT-OPEN.txt" },
	{ id: ".DS_Store" },
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
	{ id: "documents", isFolder: true },
	{ id: "projects", isFolder: true },
	{ id: "photos", isFolder: true },
	{ id: "music", isFolder: true },
	{ id: "config", isFolder: true },
	{ id: "downloads", isFolder: true },
	{ id: "todo.txt" },
	{ id: "scratch.md" },
	{ id: "passwords-DO-NOT-OPEN.txt" },
	{ id: ".DS_Store" },
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
