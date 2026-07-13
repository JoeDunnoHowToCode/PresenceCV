import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import * as LucideIcons from 'lucide-react';
import isEqual from 'fast-deep-equal';
import { ListItem } from '../../types';
import { useDebouncedInput } from './InfoEditor';

interface ListBlockEditorProps {
  block: any;
  updateBlockTitle: (blockId: string, title: string) => void;
  updateListItem: (blockId: string, itemId: string, field: keyof ListItem, value: string) => void;
  removeListItem: (blockId: string, itemId: string) => void;
  addListItem: (blockId: string) => void;
}

const ListBlockEditor = React.memo(({
  block,
  updateBlockTitle,
  updateListItem,
  removeListItem,
  addListItem
}: ListBlockEditorProps) => {

  const titleInput = useDebouncedInput(block.title, (val) => updateBlockTitle(block.id, val));

  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-12">
        <input
          ref={titleInput.ref as React.Ref<HTMLInputElement>}
          defaultValue={titleInput.defaultValue}
          onChange={titleInput.onChange}
          onBlur={titleInput.onBlur}
          className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-accent outline-none text-sm font-bold uppercase tracking-[0.2em] text-text-secondary pb-1 transition-colors hover-glow-text"
          placeholder="Section Title"
        />
      </div>

      <Droppable droppableId={block.id} type="list-items">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
            {block.items.map((item: ListItem, index: number) => (
              // @ts-expect-error hello-pangea/dnd types don't officially include key but React requires it
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(provided, snapshot) => (
                  <ListItemEditor
                    provided={provided}
                    snapshot={snapshot}
                    blockId={block.id}
                    item={item}
                    updateListItem={updateListItem}
                    removeListItem={removeListItem}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            <button
              onClick={() => addListItem(block.id)}
              className="w-full glass py-4 rounded-2xl flex items-center justify-center gap-2 text-text-secondary hover:text-accent hover:bg-white/5 transition-all hover-glow"
            >
              <LucideIcons.Plus className="w-4 h-4" />
              <span className="text-xs tracking-widest uppercase">Add Item</span>
            </button>
          </div>
        )}
      </Droppable>
    </div>
  );
}, (prevProps, nextProps) => {
  return isEqual(prevProps.block, nextProps.block);
});

interface ListItemEditorProps {
  provided: any;
  snapshot: any;
  blockId: string;
  item: ListItem;
  updateListItem: (blockId: string, itemId: string, field: keyof ListItem, value: string) => void;
  removeListItem: (blockId: string, itemId: string) => void;
}

const ListItemEditor = React.memo(({ provided, snapshot, blockId, item, updateListItem, removeListItem }: ListItemEditorProps) => {
  const titleInput = useDebouncedInput(item.title, (val) => updateListItem(blockId, item.id, 'title', val));
  const subtitleInput = useDebouncedInput(item.subtitle, (val) => updateListItem(blockId, item.id, 'subtitle', val));
  const periodInput = useDebouncedInput(item.period, (val) => updateListItem(blockId, item.id, 'period', val));
  const descInput = useDebouncedInput(item.description || '', (val) => updateListItem(blockId, item.id, 'description', val));

  return (
    <div 
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={`glass p-6 rounded-2xl space-y-4 relative group ${snapshot.isDragging ? 'z-50 shadow-2xl' : ''}`}
    >
      <div 
        {...provided.dragHandleProps}
        className="absolute left-4 top-4 text-white/20 hover:text-accent cursor-grab active:cursor-grabbing transition-colors"
      >
        <LucideIcons.GripVertical className="w-5 h-5" />
      </div>
      <button 
        onClick={() => removeListItem(blockId, item.id)} 
        className="absolute top-4 right-4 text-text-secondary hover:text-red-400 transition-colors"
      >
        <LucideIcons.X className="w-4 h-4" />
      </button>
      <div className="pl-8">
        <input
          ref={titleInput.ref as React.Ref<HTMLInputElement>}
          defaultValue={titleInput.defaultValue}
          onChange={titleInput.onChange}
          onBlur={titleInput.onBlur}
          className="w-full bg-transparent border-b border-white/20 focus:border-accent outline-none font-serif text-2xl pb-1 transition-colors hover-glow"
          placeholder="Role / Degree"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <input
            ref={subtitleInput.ref as React.Ref<HTMLInputElement>}
            defaultValue={subtitleInput.defaultValue}
            onChange={subtitleInput.onChange}
            onBlur={subtitleInput.onBlur}
            className="w-full bg-transparent border-b border-white/20 focus:border-accent outline-none text-xs tracking-widest uppercase pb-1 transition-colors hover-glow-text"
            placeholder="Company / Institution"
          />
          <input
            ref={periodInput.ref as React.Ref<HTMLInputElement>}
            defaultValue={periodInput.defaultValue}
            onChange={periodInput.onChange}
            onBlur={periodInput.onBlur}
            className="w-full bg-transparent border-b border-white/20 focus:border-accent outline-none text-xs tracking-widest uppercase pb-1 transition-colors hover-glow-text"
            placeholder="Period (e.g. 2021 - Present)"
          />
        </div>
        <textarea
          ref={descInput.ref as React.Ref<HTMLTextAreaElement>}
          defaultValue={descInput.defaultValue}
          onChange={descInput.onChange}
          onBlur={descInput.onBlur}
          className="w-full mt-4 bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-accent/50 outline-none resize-none transition-colors hover-glow-text"
          rows={3}
          placeholder="Description..."
        />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return isEqual(prevProps.item, nextProps.item) &&
         prevProps.snapshot.isDragging === nextProps.snapshot.isDragging;
});

export default ListBlockEditor;
