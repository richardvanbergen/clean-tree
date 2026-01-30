# GraphQL Schema for Tree Component

The frontend tree component expects the following data shapes and operations. Implement these queries and mutations to support the full feature set.

## Types

```graphql
type TreeItem {
  id: ID!
  isFolder: Boolean
}

type MoveItemResult {
  """Items now in the source branch after the move"""
  sourceBranchItems: [TreeItem!]!
  """Items now in the target branch after the move"""
  targetBranchItems: [TreeItem!]!
}
```

## Queries

### Load children of a branch

Used for lazy-loading. Called when a folder is expanded for the first time (or when the root mounts if no initial data is provided).

`branchId` is `null` for root-level items, or the parent folder's ID for nested items.

```graphql
query LoadChildren($branchId: ID) {
  loadChildren(branchId: $branchId): [TreeItem!]!
}
```

**Example:**

```graphql
# Root items
query { loadChildren(branchId: null) }
# => [{ id: "src", isFolder: true }, { id: "README.md", isFolder: false }]

# Children of "src"
query { loadChildren(branchId: "src") }
# => [{ id: "index.ts", isFolder: false }, { id: "components", isFolder: true }]
```

## Mutations

### Move an item

Called when the user drags and drops an item to a new position. The frontend performs an optimistic update immediately, then reconciles with the server response.

```graphql
mutation MoveItem(
  $itemId: ID!
  $sourceBranchId: ID
  $targetBranchId: ID
  $targetIndex: Int!
): MoveItemResult!
```

| Argument | Description |
|---|---|
| `itemId` | The item being moved |
| `sourceBranchId` | Branch the item is moving *from* (`null` = root) |
| `targetBranchId` | Branch the item is moving *to* (`null` = root) |
| `targetIndex` | Zero-based insertion index in the target branch |

**Returns** the full ordered list of items for both the source and target branches. The frontend uses these to reconcile its optimistic state.

**Example:**

```graphql
mutation {
  moveItem(
    itemId: "utils.ts"
    sourceBranchId: null
    targetBranchId: "src"
    targetIndex: 0
  ) {
    sourceBranchItems { id, isFolder }
    targetBranchItems { id, isFolder }
  }
}
```

### Create an item

Called when the user creates a new file/item inside a branch.

```graphql
mutation CreateItem($parentBranchId: ID, $item: TreeItemInput!): [TreeItem!]!
```

```graphql
input TreeItemInput {
  id: ID!
  isFolder: Boolean
}
```

**Returns** the full ordered list of items for that branch after creation.

**Example:**

```graphql
mutation {
  createItem(
    parentBranchId: "src"
    item: { id: "helpers.ts", isFolder: false }
  )
  # => [{ id: "index.ts" }, { id: "helpers.ts" }, { id: "components", isFolder: true }]
}
```

### Create a folder

Same contract as `createItem`, but for folders.

```graphql
mutation CreateFolder($parentBranchId: ID, $folder: TreeItemInput!): [TreeItem!]!
```

**Example:**

```graphql
mutation {
  createFolder(
    parentBranchId: null
    folder: { id: "docs", isFolder: true }
  )
  # => [{ id: "src", isFolder: true }, { id: "docs", isFolder: true }, { id: "README.md" }]
}
```

### Delete an item

Called when the user deletes a file/item from a branch.

```graphql
mutation DeleteItem($itemId: ID!, $branchId: ID): [TreeItem!]!
```

**Returns** the full ordered list of items remaining in that branch.

**Example:**

```graphql
mutation {
  deleteItem(itemId: "helpers.ts", branchId: "src")
  # => [{ id: "index.ts" }, { id: "components", isFolder: true }]
}
```

### Delete a folder

Same contract as `deleteItem`, but for folders. The backend should handle recursive deletion of nested contents.

```graphql
mutation DeleteFolder($folderId: ID!, $branchId: ID): [TreeItem!]!
```

**Example:**

```graphql
mutation {
  deleteFolder(folderId: "docs", branchId: null)
  # => [{ id: "src", isFolder: true }, { id: "README.md" }]
}
```

## Summary

| Operation | Signature | Returns |
|---|---|---|
| Load children | `loadChildren(branchId)` | `[TreeItem!]!` |
| Move item | `moveItem(itemId, sourceBranchId, targetBranchId, targetIndex)` | `MoveItemResult!` |
| Create item | `createItem(parentBranchId, item)` | `[TreeItem!]!` |
| Create folder | `createFolder(parentBranchId, folder)` | `[TreeItem!]!` |
| Delete item | `deleteItem(itemId, branchId)` | `[TreeItem!]!` |
| Delete folder | `deleteFolder(folderId, branchId)` | `[TreeItem!]!` |

### Key conventions

- **`branchId: null`** always means the root level of the tree.
- **All mutations return the full branch item list** after the operation. The frontend replaces its local state with this list to stay in sync.
- **`MoveItem` returns two branch lists** because a cross-branch move affects both the source and target.
- **Item ordering matters.** The returned arrays define the display order. The backend is the source of truth for ordering.
