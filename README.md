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
  { id: 'a', children: [{ id: 'a-1' }, { id: 'a-2' }] },
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
import { Tree, type TreeItemData, type TreeItemRenderProps, type TreeItem } from 'clean-tree';

function renderItem({ item, level, state, instruction, hasChildren, isOpen, toggleOpen }: TreeItemRenderProps) {
  return (
    <div style={{ position: 'relative' }}>
      {instruction && <DropIndicator instruction={instruction} />}
      <div style={{ paddingLeft: level * 20, opacity: state === 'dragging' ? 0.5 : 1 }}>
        {hasChildren && <button onClick={toggleOpen}>{isOpen ? '▼' : '▶'}</button>}
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
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: '#0052CC', borderRadius: 1 }} />
  );
}

export default function App() {
  return (
    <Tree
      items={items}
      renderItem={renderItem}
      renderDragPreview={renderDragPreview}
      renderDropZoneIndicator={renderDropZoneIndicator}
      onItemMoved={triggerPostMoveFlash}
    />
  );
}
```

## API Reference

### `<Tree>`

High-level component that renders a full tree from nested data.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `items` | `TreeItemData[]` | Yes | Nested tree data |
| `renderItem` | `(props: TreeItemRenderProps) => ReactNode` | Yes | Render function for each tree item |
| `renderDragPreview` | `(item: TreeItem) => ReactNode` | No | Custom drag preview. If omitted, uses browser default. |
| `renderDropZoneIndicator` | `(isDraggedOver: boolean) => ReactNode` | No | Indicator for the root-level drop zone at the end of the list |
| `onItemMoved` | `(element: HTMLElement) => void` | No | Called after an item is moved, with its DOM element. Use for animations like `triggerPostMoveFlash`. |
| `indentPerLevel` | `number` | No | Pixels of indent per nesting level (default: `20`) |

### `<TreeProvider>`

Low-level provider for building custom tree layouts. Used internally by `<Tree>`.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `initialBranchData` | `Map<string \| null, TreeItem[]>` | No | Pre-flattened branch data |
| `onItemMoved` | `(element: HTMLElement) => void` | No | Called after an item is moved |

### `<TreeBranch>`

Renders children of a branch. Uses a render-prop pattern.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string \| null` | Yes | Branch ID (`null` for root) |
| `children` | `(items: TreeItem[]) => ReactNode` | Yes | Render function receiving the branch's items |

### `<TreeItemCore>`

Core item component (exported as `TreeItemCore`). Handles drag-and-drop for a single item.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `item` | `TreeItem` | Yes | The item data |
| `level` | `number` | Yes | Nesting depth (0-based) |
| `index` | `number` | Yes | Position within its branch |
| `indentPerLevel` | `number` | No | Pixels of indent per level (default: `20`) |
| `renderDragPreview` | `(item: TreeItem) => ReactNode` | No | Custom drag preview |
| `children` | `(props: TreeItemRenderProps) => ReactNode` | Yes | Render function |

## Render Props Reference

### `TreeItemRenderProps`

Passed to `renderItem` and the `TreeItemCore` children function:

| Prop | Type | Description |
|------|------|-------------|
| `item` | `TreeItem` | The item data |
| `level` | `number` | Nesting depth |
| `state` | `'idle' \| 'dragging'` | Current drag state |
| `instruction` | `Instruction \| null` | Drop instruction from pragmatic-drag-and-drop (`reorder-above`, `reorder-below`, `make-child`, `reparent`) |
| `isOpen` | `boolean` | Whether the item's children are expanded |
| `hasChildren` | `boolean` | Whether the item has child branches |
| `toggleOpen` | `() => void` | Toggle expand/collapse |
| `dragHandleRef` | `RefObject<HTMLElement \| null>` | Attach to a drag handle element. If not used, the entire item row is draggable. |

## Data Types

### `TreeItem`

```ts
type TreeItem = {
  id: string;
  isOpen?: boolean;
};
```

### `TreeItemData`

Input format for nested tree data. Flattened into per-branch arrays on mount.

```ts
type TreeItemData = {
  id: string;
  isOpen?: boolean;
  children?: TreeItemData[];
};
```

## Running the Example

```sh
bun --hot examples/server.ts
```

## Running Tests

```sh
bun test
```
