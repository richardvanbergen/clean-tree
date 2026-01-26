import React, { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import invariant from 'tiny-invariant';
import { Dialog } from '@base-ui-components/react/dialog';
import { Select } from '@base-ui-components/react/select';

import { TreeContext } from '../core/contexts.ts';

export type MoveDialogProps = {
	itemId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	renderBackdrop?: () => ReactNode;
	renderPopup?: (props: {
		title: ReactNode;
		parentSelect: ReactNode;
		positionSelect: ReactNode;
		actions: ReactNode;
	}) => ReactNode;
	className?: string;
};

export function MoveDialog({
	itemId,
	open,
	onOpenChange,
	renderBackdrop,
	renderPopup,
	className,
}: MoveDialogProps) {
	const { dispatch, getChildrenOfItem, getMoveTargets, getPathToItem } = useContext(TreeContext);

	const options = useMemo(() => {
		const targets = getMoveTargets({ itemId });
		const targetOptions = targets.map((item) => ({
			label: `Item ${item.id}`,
			value: item.id,
		}));
		return [{ label: 'No parent', value: '' }, ...targetOptions];
	}, [getMoveTargets, itemId]);

	const defaultParent = useMemo(() => {
		const path = getPathToItem(itemId);
		const parentId = path[path.length - 1] ?? '';
		const option = options.find((opt) => opt.value === parentId);
		invariant(option);
		return option;
	}, [getPathToItem, itemId, options]);

	const [parentId, setParentId] = useState(defaultParent.value);

	const positionOptions = useMemo(() => {
		const targets = getChildrenOfItem(parentId).filter((item) => item.id !== itemId);
		return Array.from({ length: targets.length + 1 }, (_, index) => ({
			label: String(index + 1),
			value: index + 1,
		}));
	}, [getChildrenOfItem, itemId, parentId]);

	const [position, setPosition] = useState(positionOptions[0]?.value ?? 1);

	// Reset position when parent changes
	useEffect(() => {
		setPosition(positionOptions[0]?.value ?? 1);
	}, [positionOptions]);

	const handleSubmit = useCallback(() => {
		dispatch({
			type: 'modal-move',
			itemId,
			targetId: parentId,
			index: position - 1,
		});
		onOpenChange(false);
	}, [dispatch, itemId, parentId, position, onOpenChange]);

	const handleParentChange = useCallback((value: string | null) => {
		if (value !== null) {
			setParentId(value);
		}
	}, []);

	const handlePositionChange = useCallback((value: number | null) => {
		if (value !== null) {
			setPosition(value);
		}
	}, []);

	const parentSelect = (
		<Select.Root value={parentId} onValueChange={handleParentChange}>
			<Select.Trigger className="move-dialog-select-trigger">
				<Select.Value />
			</Select.Trigger>
			<Select.Portal>
				<Select.Positioner>
					<Select.Popup className="move-dialog-select-popup">
						{options.map((opt) => (
							<Select.Item key={opt.value} value={opt.value} className="move-dialog-select-option">
								<Select.ItemIndicator className="move-dialog-select-indicator">
									✓
								</Select.ItemIndicator>
								<Select.ItemText>{opt.label}</Select.ItemText>
							</Select.Item>
						))}
					</Select.Popup>
				</Select.Positioner>
			</Select.Portal>
		</Select.Root>
	);

	const positionSelect = (
		<Select.Root value={position} onValueChange={handlePositionChange}>
			<Select.Trigger className="move-dialog-select-trigger">
				<Select.Value />
			</Select.Trigger>
			<Select.Portal>
				<Select.Positioner>
					<Select.Popup className="move-dialog-select-popup">
						{positionOptions.map((opt) => (
							<Select.Item key={opt.value} value={opt.value} className="move-dialog-select-option">
								<Select.ItemIndicator className="move-dialog-select-indicator">
									✓
								</Select.ItemIndicator>
								<Select.ItemText>{opt.label}</Select.ItemText>
							</Select.Item>
						))}
					</Select.Popup>
				</Select.Positioner>
			</Select.Portal>
		</Select.Root>
	);

	const title = <Dialog.Title>Move Item {itemId}</Dialog.Title>;

	const actions = (
		<>
			<Dialog.Close className="move-dialog-button move-dialog-button-cancel">
				Cancel
			</Dialog.Close>
			<button
				type="button"
				className="move-dialog-button move-dialog-button-primary"
				onClick={handleSubmit}
			>
				Move
			</button>
		</>
	);

	const defaultPopup = (
		<Dialog.Popup className={className ?? 'move-dialog-popup'}>
			{title}
			<Dialog.Description>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
					<label>
						<span>Parent</span>
						{parentSelect}
					</label>
					<label>
						<span>Position</span>
						{positionSelect}
					</label>
				</div>
			</Dialog.Description>
			<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
				{actions}
			</div>
		</Dialog.Popup>
	);

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				{renderBackdrop ? renderBackdrop() : <Dialog.Backdrop className="move-dialog-backdrop" />}
				{renderPopup
					? renderPopup({ title, parentSelect, positionSelect, actions })
					: defaultPopup}
			</Dialog.Portal>
		</Dialog.Root>
	);
}
