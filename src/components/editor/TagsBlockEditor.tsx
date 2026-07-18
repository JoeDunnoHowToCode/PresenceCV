import React, { KeyboardEvent, useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import * as LucideIcons from 'lucide-react';
import isEqual from 'fast-deep-equal';
import { TagItem } from '../../types';
import { useDebouncedInput } from './InfoEditor';

interface TagsBlockEditorProps {
  block: any;
  updateBlockTitle: (blockId: string, title: string) => void;
  updateTagItem: (blockId: string, itemId: string, text: string) => void;
  removeTagItem: (blockId: string, itemId: string) => void;
  addTagItem: (blockId: string, text: string) => void;
}

const TagsBlockEditor = React.memo(({
  block,
  updateBlockTitle,
  updateTagItem,
  removeTagItem,
  addTagItem
}: TagsBlockEditorProps) => {

  const titleInput = useDebouncedInput(block.title, (val) => updateBlockTitle(block.id, val));
  const [newTagText, setNewTagText] = useState('');

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTagText.trim()) {
      addTagItem(block.id, newTagText.trim());
      setNewTagText('');
    }
  };

  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-12">
        <input
          ref={titleInput.ref as React.Ref<HTMLInputElement>}
          defaultValue={titleInput.defaultValue}
          onChange={titleInput.onChange}
          onBlur={titleInput.onBlur}
          className="bg-transparent border-b border-transparent hover:border-[#eceae4] focus:border-accent outline-none text-sm font-bold uppercase tracking-[0.2em] text-[#5f5f5d] pb-1 transition-colors "
          placeholder="Section Title"
        />
      </div>

      <Droppable droppableId={block.id} type="tag-items">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
            {block.items.map((item: TagItem, index: number) => (
              // @ts-expect-error hello-pangea/dnd types don't officially include key but React requires it
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(provided, snapshot) => (
                  <TagItemEditor
                    provided={provided}
                    snapshot={snapshot}
                    blockId={block.id}
                    item={item}
                    updateTagItem={updateTagItem}
                    removeTagItem={removeTagItem}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            <div className="bg-white/50 border border-[#eceae4] p-4 rounded-xl flex items-center gap-4">
              <LucideIcons.Plus className="w-5 h-5 text-[#5f5f5d] opacity-50" />
              <input
                value={newTagText}
                onChange={e => setNewTagText(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add new category/skills (e.g., Python: ML, NLP) (Press Enter)"
                className="flex-1 bg-transparent border-b border-[#eceae4] focus:border-accent outline-none text-sm tracking-wide px-1 pb-1 transition-colors text-[#5f5f5d]"
              />
            </div>
          </div>
        )}
      </Droppable>
    </div>
  );
}, (prevProps, nextProps) => {
  return isEqual(prevProps.block, nextProps.block);
});

interface TagItemEditorProps {
  provided: any;
  snapshot: any;
  blockId: string;
  item: TagItem;
  updateTagItem: (blockId: string, itemId: string, text: string) => void;
  removeTagItem: (blockId: string, itemId: string) => void;
}

const TagItemEditor = React.memo(({ provided, snapshot, blockId, item, updateTagItem, removeTagItem }: TagItemEditorProps) => {
  const textInput = useDebouncedInput(item.text, (val) => updateTagItem(blockId, item.id, val));

  return (
    <div 
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={`bg-white border border-[#eceae4] shadow-sm p-4 rounded-xl flex items-center gap-4 ${snapshot.isDragging ? 'z-50 shadow-2xl' : ''}  group`}
    >
      <div 
        {...provided.dragHandleProps}
        className="cursor-grab active:cursor-grabbing text-[#eceae4] hover:text-accent transition-colors"
      >
        <LucideIcons.GripVertical className="w-5 h-5" />
      </div>
      <input
        ref={textInput.ref as React.Ref<HTMLInputElement>}
        defaultValue={textInput.defaultValue}
        onChange={textInput.onChange}
        onBlur={textInput.onBlur}
        placeholder="Category/skills"
        className="flex-1 bg-transparent border-b border-[#eceae4] hover:border-[#1c1c1c]/20 focus:border-accent outline-none text-base tracking-wide text-[#1c1c1c] transition-colors pb-1"
      />
      <button 
        onClick={() => removeTagItem(blockId, item.id)} 
        className="text-[#5f5f5d] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
      >
        <LucideIcons.X className="w-4 h-4" />
      </button>
    </div>
  );
}, (prevProps, nextProps) => {
  return isEqual(prevProps.item, nextProps.item) &&
         prevProps.snapshot.isDragging === nextProps.snapshot.isDragging;
});

export default TagsBlockEditor;
