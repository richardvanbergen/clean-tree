# clean-tree

A headless, drag-and-drop tree component for React. Built on top of [`@atlaskit/pragmatic-drag-and-drop`](https://atlassian.design/components/pragmatic-drag-and-drop).

All presentational concerns (drag previews, drop indicators, move animations) are left to the consumer via render props and callbacks. The core package contains zero visual opinions.

## Installation

```sh
bun install
```

## Quick Start

```tsx
import { Tree, type TreeItemData, type TreeItemRenderProps } from 'clean-tree';

const items: TreeItemData[] = [
  { id: 'a', isFolder: true, children: [{ id: 'a-1' }, { id: 'a-2' }] },
  { id: 'b' },
];

function renderItem({ item, level, hasChildren, isOpen, toggleOpen }: TreeItemRenderProps) {
  return (
    <div style={{ paddingLeft: level * 20 }}>
      {hasChildren && <button onClick={toggleOpen}>{isOpen ? '▼' : '▶'}</button>}
      <span>{item.id}</span>
    </div>
  );
}

export default function App() {
  return <Tree items={items} renderItem={renderItem} />;
}
```

This renders a fully functional drag-and-drop tree with no custom visuals — items use the browser's default drag preview, no drop indicators are shown, and no move animation plays.

## Full Example

Add all visual customizations by providing the optional render props:

```tsx
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/tree-item';
import { triggerPostMoveFlash } from '@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash';
import {
  Tree,
  type TreeItem,
  type TreeItemData,
  type TreeItemRenderProps,
  type MoveItemArgs,
  type MoveItemResult,
} from 'clean-tree';

const items: TreeItemData[] = [
  { id: 'documents', isFolder: true },
  { id: 'readme.md' },
];

// Server-driven move with optimistic updates
async function handleMoveItem(args: MoveItemArgs): Promise<MoveItemResult> {
  const response = await fetch('/api/move', {
    method: 'POST',
    body: JSON.stringify(args),
  });
  return response.json();
}

// Async child loading (called when a folder is expanded)
async function loadChildren(parentId: string | null): Promise<TreeItem[]> {
  const response = await fetch(`/api/children/${parentId}`);
  return response.json();
}

function renderItem({
  item, level, state, instruction, isFolder, hasChildren, isOpen, toggleOpen,
}: TreeItemRenderProps) {
  return (
    <div style={{ position: 'relative' }}>
      {instruction && <DropIndicator instruction={instruction} />}
      <div
        onClick={isFolder ? toggleOpen : undefined}
        style={{ paddingLeft: level * 20, opacity: state === 'dragging' ? 0.5 : 1 }}
      >
        {isFolder && <span>{isOpen ? '▼' : '▶'}</span>}
        <span>{item.id}</span>
      </div>
    </div>
  );
}

function renderDragPreview(item: TreeItem) {
  return (
    <div style={{ padding: '4px 8px', background: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
      {item.id}
    </div>
  );
}

function renderDropZoneIndicator(isDraggedOver: boolean) {
  if (!isDraggedOver) return null;
  return <div style={{ height: 2, background: '#0052CC' }} />;
}

function renderLoading() {
  return <div style={{ padding: '6px 8px', color: '#999' }}>Loading...</div>;
}

export default function App() {
  return (
    <Tree
      items={items}
      renderItem={renderItem}
      renderDragPreview={renderDragPreview}
      renderDropZoneIndicator={renderDropZoneIndicator}
      onItemMoved={triggerPostMoveFlash}
      indentPerLevel={20}
      loadChildren={loadChildren}
      onMoveItem={handleMoveItem}
      renderLoading={renderLoading}
    />
  );
}
```

## API Reference

### `<Tree>`

High-level component that renders a full tree from nested data. Internally composes `TreeProvider`, `TreeBranch`, and `TreeItem`.

```ts
type TreeProps = {
  items: TreeItemData[];
  renderItem: (props: TreeItemRenderProps) => ReactNode;
  renderDragPreview?: (item: TreeItem) => ReactNode;
  renderDropZoneIndicator?: (isDraggedOver: boolean) => ReactNode;
  onItemMoved?: (element: HTMLElement) => void;
  indentPerLevel?: number;
  loadChildren?: (parentId: string | null) => Promise<TreeItem[]>;
  onMoveItem?: (args: MoveItemArgs) => Promise<MoveItemResult>;
  onCreateItem?: (parentBranchId: string | null, item: TreeItem) => Promise<TreeItem[]>;
  onCreateFolder?: (parentBranchId: string | null, folder: TreeItem) => Promise<TreeItem[]>;
  onDeleteItem?: (itemId: string, branchId: string | null) => Promise<TreeItem[]>;
  onDeleteFolder?: (folderId: string, branchId: string | null) => Promise<TreeItem[]>;
  renderLoading?: () => ReactNode;
};
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `items` | `TreeItemData[]` | Yes | Nested tree data. Flattened into per-branch arrays on mount. |
| `renderItem` | `(props: TreeItemRenderProps) => ReactNode` | Yes | Render function for each tree item. |
| `renderDragPreview` | `(item: TreeItem) => ReactNode` | No | Custom drag preview. If omitted, uses browser default. |
| `renderDropZoneIndicator` | `(isDraggedOver: boolean) => ReactNode` | No | Indicator for the root-level drop zone at the end of the list. |
| `onItemMoved` | `(element: HTMLElement) => void` | No | Called after an item is moved, with its DOM element. Use for animations like `triggerPostMoveFlash`. |
| `indentPerLevel` | `number` | No | Pixels of indent per nesting level (default: `20`). |
| `loadChildren` | `(parentId: string \| null) => Promise<TreeItem[]>` | No | Async loader called when a branch mounts with no children. Use for lazy-loading folder contents. |
| `onMoveItem` | `(args: MoveItemArgs) => Promise<MoveItemResult>` | No | Server-driven move callback. Called after optimistic local update. Returns authoritative items for both branches. On failure, both branches roll back automatically. |
| `onCreateItem` | `(parentBranchId: string \| null, item: TreeItem) => Promise<TreeItem[]>` | No | Called after an item is created. Returns updated branch items. Rolls back on failure. |
| `onCreateFolder` | `(parentBranchId: string \| null, folder: TreeItem) => Promise<TreeItem[]>` | No | Called after a folder is created. Returns updated branch items. Rolls back on failure. |
| `onDeleteItem` | `(itemId: string, branchId: string \| null) => Promise<TreeItem[]>` | No | Called after an item is deleted. Returns updated branch items. Rolls back on failure. |
| `onDeleteFolder` | `(folderId: string, branchId: string \| null) => Promise<TreeItem[]>` | No | Called after a folder is deleted. Returns updated branch items. Rolls back on failure. |
| `renderLoading` | `() => ReactNode` | No | Rendered after a branch's items while `loadChildren` is in progress. |

## Core Components

For full control over rendering and layout, use the core components directly instead of `<Tree>`.

### Rendering hierarchy

```
TreeProvider
  └─ TreeBranch (id=null, root)
       ├─ TreeItemCore (item A)
       │    └─ TreeBranch (id="A", when A is open)
       │         ├─ TreeItemCore (item A-1)
       │         └─ TreeItemCore (item A-2)
       └─ TreeItemCore (item B)
```

### `<TreeProvider>`

Wraps the tree and provides context for all branches and items.

```ts
type TreeProviderProps = {
  initialBranchData?: Map<string | null, TreeItem[]>;
  initialOpenState?: Map<string, boolean>;
  onItemMoved?: (element: HTMLElement) => void;
  children: ReactNode;
};
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `initialBranchData` | `Map<string \| null, TreeItem[]>` | No | Pre-flattened branch data. Key is the parent item ID (`null` for root). |
| `initialOpenState` | `Map<string, boolean>` | No | Initial open/closed state for items by ID. |
| `onItemMoved` | `(element: HTMLElement) => void` | No | Called after an item is added to the DOM via drag-drop. |

### `<TreeBranch>`

Manages a list of items for a single branch (parent). Uses a render-prop pattern.

```ts
type TreeBranchProps = {
  id: string | null;
  initialChildren?: TreeItem[];
  loadChildren?: (id: string | null) => Promise<TreeItem[]>;
  onMoveItem?: (args: MoveItemArgs) => Promise<MoveItemResult>;
  onCreateItem?: (parentBranchId: string | null, item: TreeItem) => Promise<TreeItem[]>;
  onCreateFolder?: (parentBranchId: string | null, folder: TreeItem) => Promise<TreeItem[]>;
  onDeleteItem?: (itemId: string, branchId: string | null) => Promise<TreeItem[]>;
  onDeleteFolder?: (folderId: string, branchId: string | null) => Promise<TreeItem[]>;
  children: (items: TreeItem[], isLoading: boolean) => ReactNode;
};
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string \| null` | Yes | Branch ID. Use `null` for the root branch, or the parent item's ID for nested branches. |
| `initialChildren` | `TreeItem[]` | No | Explicit initial items. If omitted, resolves from context (live registry, saved state, or initial data). |
| `loadChildren` | `(id: string \| null) => Promise<TreeItem[]>` | No | Async loader called on mount when the branch has no items. |
| `onMoveItem` | `(args: MoveItemArgs) => Promise<MoveItemResult>` | No | Server-driven move. Called by the target branch after optimistic update. |
| `onCreateItem` | `(parentBranchId: string \| null, item: TreeItem) => Promise<TreeItem[]>` | No | Server callback for item creation. |
| `onCreateFolder` | `(parentBranchId: string \| null, folder: TreeItem) => Promise<TreeItem[]>` | No | Server callback for folder creation. |
| `onDeleteItem` | `(itemId: string, branchId: string \| null) => Promise<TreeItem[]>` | No | Server callback for item deletion. |
| `onDeleteFolder` | `(folderId: string, branchId: string \| null) => Promise<TreeItem[]>` | No | Server callback for folder deletion. |
| `children` | `(items: TreeItem[], isLoading: boolean) => ReactNode` | Yes | Render function. Receives current items and loading state. |

### `<TreeItemCore>`

Handles drag-and-drop for a single item. Exported as `TreeItemCore` to avoid collision with the `TreeItem` type.

```ts
type TreeItemProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  item: TreeItem;
  level: number;
  index: number;
  indentPerLevel?: number;
  renderDragPreview?: (item: TreeItem) => ReactNode;
  children: (props: TreeItemRenderProps) => ReactNode;
};
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `item` | `TreeItem` | Yes | The item data. |
| `level` | `number` | Yes | Nesting depth (0 for root items). |
| `index` | `number` | Yes | Position within its branch. |
| `indentPerLevel` | `number` | No | Pixels of indent per level (default: `20`). Used for drop target hit area calculation. |
| `renderDragPreview` | `(item: TreeItem) => ReactNode` | No | Custom drag preview. |
| `children` | `(props: TreeItemRenderProps) => ReactNode` | Yes | Render function. |

### `useTreeBranch()`

Hook to access the current branch's context. Must be called within a `<TreeBranch>`.

```ts
function useTreeBranch(): TreeBranchContextValue;

type TreeBranchContextValue = {
  parentId: string | null;
  items: TreeItem[];
  isLoading: boolean;
  setItems: React.Dispatch<React.SetStateAction<TreeItem[]>>;
  createItem: (item: TreeItem) => void;
  createFolder: (folder: TreeItem) => void;
  deleteItem: (itemId: string) => void;
  deleteFolder: (folderId: string) => void;
};
```

`createItem`, `createFolder`, `deleteItem`, and `deleteFolder` apply optimistic updates immediately, then call the corresponding `onCreateItem`/`onCreateFolder`/`onDeleteItem`/`onDeleteFolder` callback. If the callback rejects, the branch rolls back to its pre-operation state.

### Core Components Example

```tsx
import {
  TreeProvider,
  TreeBranch,
  TreeItemCore,
  useTreeBranch,
  type TreeItem,
  type TreeItemRenderProps,
} from 'clean-tree';

const branchData = new Map<string | null, TreeItem[]>([
  [null, [{ id: 'a', isFolder: true }, { id: 'b' }]],
  ['a', [{ id: 'a-1' }, { id: 'a-2' }]],
]);

function MyItem({ item, level, index }: { item: TreeItem; level: number; index: number }) {
  return (
    <TreeItemCore item={item} level={level} index={index}>
      {({ item, level, state, instruction, isFolder, isOpen, hasChildren, toggleOpen }) => (
        <div style={{ paddingLeft: level * 20, opacity: state === 'dragging' ? 0.5 : 1 }}>
          {isFolder && <button onClick={toggleOpen}>{isOpen ? '▼' : '▶'}</button>}
          <span>{item.id}</span>
          {isOpen && (
            <MyBranch id={item.id} level={level + 1} />
          )}
        </div>
      )}
    </TreeItemCore>
  );
}

function MyBranch({ id, level }: { id: string | null; level: number }) {
  return (
    <TreeBranch id={id}>
      {(items, isLoading) => (
        <>
          {items.map((item, index) => (
            <MyItem key={item.id} item={item} level={level} index={index} />
          ))}
          {isLoading && <div>Loading...</div>}
        </>
      )}
    </TreeBranch>
  );
}

export default function App() {
  return (
    <TreeProvider initialBranchData={branchData}>
      <MyBranch id={null} level={0} />
    </TreeProvider>
  );
}
```

## Render Props Reference

### `TreeItemRenderProps`

Passed to `renderItem` (on `<Tree>`) and the `children` function (on `<TreeItemCore>`):

```ts
type TreeItemRenderProps = {
  item: TreeItem;
  level: number;
  state: 'idle' | 'dragging';
  instruction: Instruction | null;
  isOpen: boolean;
  isFolder: boolean;
  hasChildren: boolean;
  toggleOpen: () => void;
  dragHandleRef: RefObject<HTMLElement | null>;
};
```

| Prop | Type | Description |
|------|------|-------------|
| `item` | `TreeItem` | The item data. |
| `level` | `number` | Nesting depth (0 for root items). |
| `state` | `'idle' \| 'dragging'` | Current drag state of this item. |
| `instruction` | `Instruction \| null` | Drop instruction from pragmatic-drag-and-drop. One of `reorder-above`, `reorder-below`, `make-child`, `reparent`, or `null` when no drop is pending. |
| `isOpen` | `boolean` | Whether the item's children are expanded. |
| `isFolder` | `boolean` | Whether the item is a folder (`item.isFolder === true`). |
| `hasChildren` | `boolean` | Whether the item has child items in any branch. |
| `toggleOpen` | `() => void` | Toggle the item's expanded/collapsed state. |
| `dragHandleRef` | `RefObject<HTMLElement \| null>` | Attach to a drag handle element. If not used, the entire item row is draggable. |

## Data Types

### `TreeItem`

The runtime representation of a tree item.

```ts
type TreeItem = {
  id: string;
  isFolder?: boolean;
};
```

### `TreeItemData`

Input format for nested tree data. Flattened into per-branch `TreeItem[]` arrays on mount.

```ts
type TreeItemData = {
  id: string;
  isOpen?: boolean;
  isFolder?: boolean;
  children?: TreeItemData[];
};
```

### `MoveItemArgs`

Arguments passed to `onMoveItem` after an optimistic drag-drop.

```ts
type MoveItemArgs = {
  itemId: string;
  sourceBranchId: string | null;
  targetBranchId: string | null;
  targetIndex: number;
};
```

### `MoveItemResult`

Expected return value from `onMoveItem`. The tree uses these to reconcile both branches with the server's authoritative state.

```ts
type MoveItemResult = {
  sourceBranchItems: TreeItem[];
  targetBranchItems: TreeItem[];
};
```

### `TreeEventType`

Events dispatched through the tree's internal event system. Accessible via `addEventListener` on `TreeContext` or `TreeRootContext`.

```ts
type TreeEventType =
  | { type: 'item-drop-requested'; payload: DropPayload }
  | { type: 'item-added'; payload: { branchId: string | null; itemId: string } }
  | { type: 'branch-children-changed'; payload: { branchId: string; hasChildren: boolean } }
  | { type: 'branch-reconcile'; payload: { branchId: string | null; items: TreeItem[] } }
  | { type: 'open-state-changed'; payload: { itemId: string; isOpen: boolean } }
  | { type: 'item-created'; payload: { branchId: string | null; item: TreeItem } }
  | { type: 'folder-created'; payload: { branchId: string | null; folder: TreeItem } }
  | { type: 'item-deleted'; payload: { branchId: string | null; itemId: string } }
  | { type: 'folder-deleted'; payload: { branchId: string | null; folderId: string } };

type DropPayload = {
  itemId: string;
  item: TreeItem;
  sourceBranchId: string | null;
  targetBranchId: string | null;
  targetIndex: number;
  instruction: Instruction;
};
```

## Optimistic Updates

All mutation callbacks (`onMoveItem`, `onCreateItem`, `onCreateFolder`, `onDeleteItem`, `onDeleteFolder`) follow the same pattern:

1. The local state updates immediately (optimistic).
2. The callback fires in the background.
3. On success, the branch reconciles with the returned items.
4. On failure, the branch rolls back to its pre-operation snapshot.

For `onMoveItem`, if the move is cross-branch, both the source and target branches snapshot and reconcile independently. The target branch drives the server call and dispatches a `branch-reconcile` event to the source branch with the server's response.

## Running the Example

```sh
bun --hot examples/server.ts
```

## Running Tests

```sh
bun test
```
