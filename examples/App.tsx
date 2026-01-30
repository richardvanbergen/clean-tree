import { triggerPostMoveFlash } from "@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash";
import { DropIndicator } from "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/tree-item";
import { nanoid } from "nanoid";
import { useRef, useState } from "react";
import {
	type MoveItemArgs,
	type MoveItemResult,
	Tree,
	type TreeHandle,
	type TreeItem,
	type TreeItemData,
	type TreeItemRenderProps,
} from "../src/index.ts";

import "./styles.css";

type ExampleTreeItem = TreeItem & { name: string };

/**
 * Nested seed tree — human-readable names with optional children.
 * `buildSeedData()` walks this structure and assigns unique nanoid() IDs.
 */
type SeedNode = {
	name: string;
	isFolder?: boolean;
	children?: SeedNode[];
};

const seedTree: SeedNode[] = [
	{
		name: "documents", isFolder: true, children: [
			{ name: "contracts", isFolder: true, children: [
				{ name: "freelance-agreement.pdf" },
				{ name: "nda-acme-corp.pdf" },
				{ name: "lease-2024.pdf" },
			]},
			{ name: "invoices", isFolder: true, children: [
				{ name: "inv-001.pdf" },
				{ name: "inv-002.pdf" },
				{ name: "inv-003.pdf" },
				{ name: "inv-004.pdf" },
			]},
			{ name: "cover-letter.docx" },
			{ name: "resume-2025.pdf" },
			{ name: "tax-return-2024.pdf" },
			{ name: "meeting-notes.md" },
		],
	},
	{
		name: "projects", isFolder: true, children: [
			{ name: "website-redesign", isFolder: true, children: [
				{ name: "assets", isFolder: true, children: [
					{ name: "logo.svg" },
					{ name: "hero-banner.png" },
					{ name: "favicon.ico" },
					{ name: "og-image.jpg" },
				]},
				{ name: "components", isFolder: true, children: [
					{ name: "Header.tsx" },
					{ name: "Footer.tsx" },
					{ name: "Sidebar.tsx" },
					{ name: "Button.tsx" },
					{ name: "Modal.tsx" },
				]},
				{ name: "index.html" },
				{ name: "styles.css" },
				{ name: "app.tsx" },
				{ name: "README.md" },
			]},
			{ name: "mobile-app", isFolder: true, children: [
				{ name: "screens", isFolder: true, children: [
					{ name: "HomeScreen.swift" },
					{ name: "ProfileScreen.swift" },
					{ name: "SettingsScreen.swift" },
					{ name: "OnboardingScreen.swift" },
				]},
				{ name: "utils", isFolder: true, children: [
					{ name: "NetworkManager.swift" },
					{ name: "CacheHelper.swift" },
					{ name: "Extensions.swift" },
				]},
				{ name: "App.swift" },
				{ name: "Package.swift" },
			]},
			{ name: "secret-side-project", isFolder: true, children: [
				{ name: "experiments", isFolder: true, children: [
					{ name: "attempt-1.py" },
					{ name: "attempt-2.py" },
					{ name: "attempt-3.py" },
					{ name: "results.csv" },
				]},
				{ name: "brainstorm.md" },
				{ name: "prototype.py" },
				{ name: "data.json" },
			]},
			{ name: "project-ideas.txt" },
		],
	},
	{
		name: "photos", isFolder: true, children: [
			{ name: "vacations", isFolder: true, children: [
				{ name: "japan-2024", isFolder: true, children: [
					{ name: "tokyo-tower.jpg" },
					{ name: "ramen-shop.jpg" },
					{ name: "shibuya-crossing.jpg" },
					{ name: "mt-fuji.jpg" },
					{ name: "temple-kyoto.jpg" },
				]},
				{ name: "iceland-2023", isFolder: true, children: [
					{ name: "northern-lights.jpg" },
					{ name: "geyser.jpg" },
					{ name: "black-sand-beach.jpg" },
				]},
				{ name: "beach-sunset.jpg" },
				{ name: "airport-selfie.jpg" },
			]},
			{ name: "pets", isFolder: true, children: [
				{ name: "dog-park.jpg" },
				{ name: "cat-sleeping.jpg" },
				{ name: "fish-tank.mp4" },
				{ name: "parrot-talking.mp4" },
			]},
			{ name: "screenshots", isFolder: true, children: [
				{ name: "bug-report-1.png" },
				{ name: "bug-report-2.png" },
				{ name: "high-score.png" },
				{ name: "funny-error.png" },
				{ name: "meme-template.png" },
			]},
			{ name: "profile-pic.jpg" },
			{ name: "panorama-mountains.jpg" },
		],
	},
	{
		name: "music", isFolder: true, children: [
			{ name: "playlists", isFolder: true, children: [
				{ name: "chill-vibes.m3u" },
				{ name: "workout-bangers.m3u" },
				{ name: "coding-focus.m3u" },
				{ name: "90s-nostalgia.m3u" },
			]},
			{ name: "recordings", isFolder: true, children: [
				{ name: "voice-memo-jan.m4a" },
				{ name: "guitar-riff.wav" },
				{ name: "podcast-draft.mp3" },
			]},
			{ name: "sample-beat.wav" },
		],
	},
	{
		name: "config", isFolder: true, children: [
			{ name: "dotfiles", isFolder: true, children: [
				{ name: ".zshrc" },
				{ name: ".gitconfig" },
				{ name: ".vimrc" },
				{ name: ".tmux.conf" },
				{ name: ".prettierrc" },
				{ name: ".eslintrc.json" },
			]},
			{ name: "ssh-keys", isFolder: true, children: [
				{ name: "id_ed25519" },
				{ name: "id_ed25519.pub" },
				{ name: "known_hosts" },
			]},
			{ name: "settings.json" },
			{ name: "preferences.yaml" },
		],
	},
	{
		name: "downloads", isFolder: true, children: [
			{ name: "installers", isFolder: true, children: [
				{ name: "node-v22.pkg" },
				{ name: "docker-desktop.dmg" },
				{ name: "vscode-arm64.deb" },
			]},
			{ name: "random-pdf.pdf" },
			{ name: "mystery-file.zip" },
			{ name: "definitely-not-a-virus.exe" },
			{ name: "lecture-notes-week3.pdf" },
			{ name: "receipt-amazon.pdf" },
			{ name: "cat-video.mp4" },
		],
	},
	{ name: "todo.txt" },
	{ name: "scratch.md" },
	{ name: "passwords-DO-NOT-OPEN.txt" },
	{ name: ".DS_Store" },
];

/**
 * Walk the nested seed tree, assign nanoid() to each node,
 * and build the flat { root, children } structure.
 */
function buildSeedData(): { root: ExampleTreeItem[]; children: Record<string, ExampleTreeItem[]> } {
	const children: Record<string, ExampleTreeItem[]> = {};

	function walk(nodes: SeedNode[]): ExampleTreeItem[] {
		return nodes.map((node) => {
			const id = nanoid();
			const item: ExampleTreeItem = { id, name: node.name };
			if (node.isFolder) item.isFolder = true;
			if (node.children) {
				children[id] = walk(node.children);
			}
			return item;
		});
	}

	const root = walk(seedTree);
	return { root, children };
}

/**
 * localStorage-backed data store.
 * Seeds from default data on first access; persists all mutations.
 */
const STORAGE_KEY = "clean-tree-demo";

interface StoredData {
	root: ExampleTreeItem[];
	children: Record<string, ExampleTreeItem[]>;
	openState?: Record<string, boolean>;
}

const db = {
	_read(): StoredData {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			try {
				const data = JSON.parse(raw) as StoredData;
				// Detect old format (items missing `name` field) and reseed
				if (data.root.length > 0 && !("name" in data.root[0])) {
					const seed = buildSeedData();
					const seeded: StoredData = { root: seed.root, children: seed.children };
					localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
					return seeded;
				}
				return data;
			} catch {
				// corrupted — fall through to seed
			}
		}
		// Seed with defaults
		const seed = buildSeedData();
		const seeded: StoredData = { root: seed.root, children: seed.children };
		localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
		return seeded;
	},

	_write(data: StoredData) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	},

	getRootItems(): TreeItem[] {
		return this._read().root;
	},

	setRootItems(items: TreeItem[]) {
		const data = this._read();
		data.root = items;
		this._write(data);
	},

	getChildren(branchId: string): TreeItem[] {
		return this._read().children[branchId] ?? [];
	},

	setChildren(branchId: string, items: TreeItem[]) {
		const data = this._read();
		data.children[branchId] = items;
		this._write(data);
	},

	getBranch(branchId: string | null): TreeItem[] {
		if (branchId === null) return this.getRootItems();
		return this.getChildren(branchId);
	},

	setBranch(branchId: string | null, items: TreeItem[]) {
		if (branchId === null) {
			this.setRootItems(items);
		} else {
			this.setChildren(branchId, items);
		}
	},

	getOpenState(): Record<string, boolean> {
		return this._read().openState ?? {};
	},

	setItemOpen(itemId: string, isOpen: boolean) {
		const data = this._read();
		const openState = data.openState ?? {};
		openState[itemId] = isOpen;
		data.openState = openState;
		this._write(data);
	},
};

async function loadChildren(parentId: string | null): Promise<TreeItem[]> {
	// Simulate network latency
	await new Promise((resolve) => setTimeout(resolve, 800));
	if (parentId === null) return [];
	return db.getChildren(parentId);
}

/**
 * Server-driven move callback.
 * Simulates latency, mutates the fake data source, and returns
 * both source and target branch items.
 */
async function handleMoveItem(args: MoveItemArgs): Promise<MoveItemResult> {
	await new Promise((resolve) => setTimeout(resolve, 500));

	const { itemId, sourceBranchId, targetBranchId, targetIndex } = args;

	// Remove from source branch
	const sourceChildren = [...db.getBranch(sourceBranchId)];
	const idx = sourceChildren.findIndex((i) => i.id === itemId);
	let movedItem: TreeItem | undefined;
	if (idx !== -1) {
		movedItem = sourceChildren[idx];
		sourceChildren.splice(idx, 1);
		db.setBranch(sourceBranchId, sourceChildren);
	}

	if (!movedItem) {
		return {
			sourceBranchItems: db.getBranch(sourceBranchId),
			targetBranchItems: db.getBranch(targetBranchId),
		};
	}

	// Insert into target branch at the requested index
	const targetChildren =
		sourceBranchId === targetBranchId
			? sourceChildren
			: [...db.getBranch(targetBranchId)];
	const clampedIndex = Math.min(targetIndex, targetChildren.length);
	targetChildren.splice(clampedIndex, 0, movedItem);
	db.setBranch(targetBranchId, targetChildren);

	return {
		sourceBranchItems:
			sourceBranchId === targetBranchId
				? targetChildren
				: db.getBranch(sourceBranchId),
		targetBranchItems: targetChildren,
	};
}

/**
 * Initial tree data — loaded from localStorage (seeded on first visit).
 * Open state is restored separately via the initialOpenState prop,
 * which covers all depths (not just root items).
 */
const initialData: TreeItemData[] = db.getRootItems();
const persistedOpenState: Record<string, boolean> = db.getOpenState();

function handleOpenStateChange(itemId: string, isOpen: boolean) {
	db.setItemOpen(itemId, isOpen);
}

async function onCreateItem(
	parentBranchId: string | null,
	item: TreeItem,
): Promise<TreeItem[]> {
	await new Promise((resolve) => setTimeout(resolve, 300));
	const branch = [...db.getBranch(parentBranchId), item];
	db.setBranch(parentBranchId, branch);
	return branch;
}

async function onCreateFolder(
	parentBranchId: string | null,
	folder: TreeItem,
): Promise<TreeItem[]> {
	await new Promise((resolve) => setTimeout(resolve, 300));
	const branch = [...db.getBranch(parentBranchId), folder];
	db.setBranch(parentBranchId, branch);
	return branch;
}

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
				<span>{(item as ExampleTreeItem).name}</span>
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
			{(item as ExampleTreeItem).name}
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

function CreateFolderIcon() {
	return (
		<svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
			<path d="M20 18H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4l2 2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2Z" />
			<text
				x="22"
				y="20"
				fontSize="14"
				fontWeight="bold"
				fill="currentColor"
				fontFamily="system-ui, sans-serif"
			>
				+
			</text>
		</svg>
	);
}

function CreateItemIcon() {
	return (
		<svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm4 18H6V4h7v5h5v11Z" />
			<text
				x="22"
				y="20"
				fontSize="14"
				fontWeight="bold"
				fill="currentColor"
				fontFamily="system-ui, sans-serif"
			>
				+
			</text>
		</svg>
	);
}

export default function App() {
	const [items] = useState(initialData);
	const treeRef = useRef<TreeHandle>(null);

	function handleCreateFolder() {
		const id = nanoid();
		treeRef.current?.createFolder({ id, isFolder: true, name: "New Folder" } as ExampleTreeItem);
	}

	function handleCreateItem() {
		const id = nanoid();
		treeRef.current?.createItem({ id, name: "New Item" } as ExampleTreeItem);
	}

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
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "4px 8px 8px",
						borderBottom: "1px solid #eee",
						marginBottom: 8,
					}}
				>
					<span style={{ fontWeight: 600, fontSize: 14 }}>Menu</span>
					<div style={{ display: "flex", gap: 4 }}>
						<button
							onClick={handleCreateFolder}
							title="Create Folder"
							style={{
								display: "flex",
								alignItems: "center",
								gap: 2,
								background: "none",
								border: "1px solid #ddd",
								borderRadius: 4,
								padding: "4px 6px",
								cursor: "pointer",
								color: "#555",
								fontSize: 13,
							}}
						>
							<CreateFolderIcon />
							<span>+</span>
						</button>
						<button
							onClick={handleCreateItem}
							title="Create Item"
							style={{
								display: "flex",
								alignItems: "center",
								gap: 2,
								background: "none",
								border: "1px solid #ddd",
								borderRadius: 4,
								padding: "4px 6px",
								cursor: "pointer",
								color: "#555",
								fontSize: 13,
							}}
						>
							<CreateItemIcon />
							<span>+</span>
						</button>
					</div>
				</div>

				<Tree
					ref={treeRef}
					items={items}
					renderItem={renderTreeItem}
					renderDragPreview={renderDragPreview}
					renderDropZoneIndicator={renderDropZoneIndicator}
					onItemMoved={triggerPostMoveFlash}
					indentPerLevel={INDENT_PER_LEVEL}
					loadChildren={loadChildren}
					onMoveItem={handleMoveItem}
					onCreateItem={onCreateItem}
					onCreateFolder={onCreateFolder}
					onOpenStateChange={handleOpenStateChange}
					initialOpenState={persistedOpenState}
					renderLoading={renderLoading}
				/>
			</div>
		</div>
	);
}
