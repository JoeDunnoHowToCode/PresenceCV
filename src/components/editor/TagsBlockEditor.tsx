import React, { KeyboardEvent, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import * as LucideIcons from 'lucide-react';
import isEqual from 'fast-deep-equal';
import { TagItem } from '../../types';
import { useDebouncedInput } from './InfoEditor';

interface TagsBlockEditorProps {
  block: any;
  updateBlockTitle: (blockId: string, title: string) => void;
  updateTagItem: (blockId: string, itemId: string, updates: Partial<TagItem>) => void;
  removeTagItem: (blockId: string, itemId: string) => void;
  addTagItem: (blockId: string, text: string) => void;
  isMobile?: boolean;
  reorderTagItems?: (blockId: string, startIndex: number, endIndex: number) => void;
}

const TagsBlockEditor = React.memo(({
  block,
  updateBlockTitle,
  updateTagItem,
  removeTagItem,
  addTagItem,
  isMobile,
  reorderTagItems
}: TagsBlockEditorProps) => {
  const { t } = useTranslation();
  const titleInput = useDebouncedInput(block.title, (val) => updateBlockTitle(block.id, val));
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleAddTag = () => {
    if (newTitle.trim() || newDesc.trim()) {
      const combined = newDesc.trim() ? `${newTitle.trim()}: ${newDesc.trim()}` : newTitle.trim();
      addTagItem(block.id, combined);
      setNewTitle('');
      setNewDesc('');
    }
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddTag();
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
          className="bg-transparent border-b border-transparent hover:border-[#eceae4] focus:border-accent outline-none text-sm font-bold tracking-[0.2em] text-[#5f5f5d] pb-1 transition-colors "
          placeholder="Section Title"
        />
      </div>

      <Droppable droppableId={block.id} type="tag-items">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {block.items.map((item: TagItem, index: number) => (
              // @ts-expect-error hello-pangea/dnd types don't officially include key but React requires it
              <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={!!isMobile}>
                {(provided, snapshot) => (
                  <TagItemEditor
                    provided={provided}
                    snapshot={snapshot}
                    blockId={block.id}
                    item={item}
                    index={index}
                    totalItems={block.items.length}
                    updateTagItem={updateTagItem}
                    removeTagItem={removeTagItem}
                    isMobile={isMobile}
                    reorderTagItems={reorderTagItems}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <div className="bg-white/50 border border-[#eceae4] p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-4 mt-4">
        <LucideIcons.Plus className="w-5 h-5 text-[#5f5f5d] opacity-50 mt-1 md:mt-0" />
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 w-full">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder={t('editor.tagsBlock.categoryPlaceholder')}
            className="bg-transparent border-b border-[#eceae4] focus:border-accent outline-none text-sm tracking-wide px-1 pb-1 transition-colors text-[#5f5f5d] w-full"
          />
          <input
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder={t('editor.tagsBlock.tagsPlaceholder')}
            className="bg-transparent border-b border-[#eceae4] focus:border-accent outline-none text-sm tracking-wide px-1 pb-1 transition-colors text-[#5f5f5d] w-full"
          />
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return isEqual(prevProps.block, nextProps.block) && prevProps.isMobile === nextProps.isMobile;
});

interface TagItemEditorProps {
  provided: any;
  snapshot: any;
  blockId: string;
  item: TagItem;
  index: number;
  totalItems: number;
  updateTagItem: (blockId: string, itemId: string, updates: Partial<TagItem>) => void;
  removeTagItem: (blockId: string, itemId: string) => void;
  isMobile?: boolean;
  reorderTagItems?: (blockId: string, startIndex: number, endIndex: number) => void;
}

const TagItemEditor = React.memo(({ provided, snapshot, blockId, item, index, totalItems, updateTagItem, removeTagItem, isMobile, reorderTagItems }: TagItemEditorProps) => {
  const { t } = useTranslation();
  const initialParts = item.text.split(':');
  const initialTitle = initialParts[0] || '';
  const initialDesc = initialParts.length > 1 ? initialParts.slice(1).join(':').trim() : '';

  const tags = initialDesc ? initialDesc.split('\n').map(s => s.trim()).filter(Boolean) : [];

  const titleInput = useDebouncedInput(initialTitle, (newTitle) => {
    const combined = tags.length ? `${newTitle.trim()}:\n${tags.join('\n')}` : newTitle.trim();
    if (combined !== item.text) {
      updateTagItem(blockId, item.id, { text: combined });
    }
  }, 500);

  const urlInput = useDebouncedInput(item.url || '', (newUrl) => {
    if (newUrl !== item.url) {
      updateTagItem(blockId, item.id, { url: newUrl });
    }
  }, 500);

  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = inputValue.trim();
      if (val) {
        const newTags = [...tags, val];
        const currentTitle = titleInput.ref.current?.value || initialTitle;
        updateTagItem(blockId, item.id, { text: newTags.length ? `${currentTitle.trim()}:\n${newTags.join('\n')}` : currentTitle.trim() });
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && inputValue === '') {
      if (tags.length > 0) {
        const newTags = tags.slice(0, -1);
        const currentTitle = titleInput.ref.current?.value || initialTitle;
        updateTagItem(blockId, item.id, { text: newTags.length ? `${currentTitle.trim()}:\n${newTags.join('\n')}` : currentTitle.trim() });
      }
    }
  };

  const removeTag = (indexToRemove: number) => {
    const newTags = tags.filter((_, i) => i !== indexToRemove);
    const currentTitle = titleInput.ref.current?.value || initialTitle;
    updateTagItem(blockId, item.id, { text: newTags.length ? `${currentTitle.trim()}:\n${newTags.join('\n')}` : currentTitle.trim() });
  };

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isConfirmingDelete) {
      const timer = setTimeout(() => setIsConfirmingDelete(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmingDelete]);

  return (
    <div 
      ref={provided.innerRef}
      {...provided.draggableProps}
      className={`bg-white border border-[#eceae4] shadow-sm p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-4 mb-4 ${snapshot.isDragging ? 'z-50 shadow-2xl' : ''}  group`}
    >
      {isMobile ? (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => reorderTagItems?.(blockId, index, index - 1)}
            className="p-1 text-[#5f5f5d] disabled:opacity-20 hover:text-accent transition-colors"
            title="Move Up"
          >
            <LucideIcons.ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={index === totalItems - 1}
            onClick={() => reorderTagItems?.(blockId, index, index + 1)}
            className="p-1 text-[#5f5f5d] disabled:opacity-20 hover:text-accent transition-colors"
            title="Move Down"
          >
            <LucideIcons.ChevronDown className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div 
          {...provided.dragHandleProps}
          aria-label={initialTitle.trim() ? t('editor.a11y.reorderItem', { title: initialTitle.trim() }) : t('editor.a11y.reorderUntitledItem')}
          className="cursor-grab active:cursor-grabbing text-[#eceae4] hover:text-accent transition-colors mt-1 md:mt-0"
        >
          <LucideIcons.GripVertical className="w-5 h-5" />
        </div>
      )}
      
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 w-full">
        <div className="flex flex-col gap-1.5 justify-start">
          <input
            ref={titleInput.ref as React.Ref<HTMLInputElement>}
            defaultValue={titleInput.defaultValue}
            onChange={titleInput.onChange}
            onBlur={titleInput.onBlur}
            placeholder={t('editor.tagsBlock.category')}
            className="bg-transparent border-b border-[#eceae4] hover:border-[#1c1c1c]/20 focus:border-accent outline-none text-base font-medium tracking-wide text-[#1c1c1c] transition-colors pb-1 w-full"
          />
          <div className="flex items-center gap-1.5 border-b border-[#eceae4] hover:border-[#1c1c1c]/20 focus-within:border-accent transition-colors pb-1 w-full opacity-60 focus-within:opacity-100 group">
            <LucideIcons.Link className="w-3.5 h-3.5 text-[#5f5f5d]" />
            <input
              ref={urlInput.ref as React.Ref<HTMLInputElement>}
              defaultValue={urlInput.defaultValue}
              onChange={urlInput.onChange}
              onBlur={urlInput.onBlur}
              placeholder={t('editor.tagsBlock.categoryUrlPlaceholder', 'https://... (optional)')}
              className="bg-transparent outline-none text-xs tracking-wide text-[#5f5f5d] w-full"
            />
          </div>
        </div>
        <div className="border-b border-[#eceae4] hover:border-[#1c1c1c]/20 focus-within:border-accent transition-colors pb-1 w-full flex flex-wrap gap-1.5 items-center cursor-text" onClick={(e) => {
          const input = e.currentTarget.querySelector('input');
          if (input) input.focus();
        }}>
          {tags.map((tag, i) => (
             <span key={i} className="px-3 py-0.5 bg-white border border-[#eceae4] rounded-full text-sm tracking-wide text-[#5f5f5d] flex items-center gap-1 group/pill">
               {tag}
               <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(i); }} className="opacity-0 group-hover/pill:opacity-100 hover:text-red-500 transition-opacity">
                  <LucideIcons.X className="w-3 h-3" />
               </button>
             </span>
          ))}
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? t('editor.tagsBlock.tags') : ''}
            className="bg-transparent outline-none text-base tracking-wide text-[#5f5f5d] flex-1 min-w-[200px] p-0 m-0"
          />
        </div>
      </div>

      {isConfirmingDelete ? (
        <button
          onClick={() => {
            removeTagItem(blockId, item.id);
            setIsConfirmingDelete(false);
          }}
          className="px-2.5 py-1 bg-red-500 text-white text-xs rounded-lg font-medium hover:bg-red-600 transition-all self-end md:self-center shrink-0 shadow-sm mt-1 md:mt-0"
        >
          {t('common.confirm')}
        </button>
      ) : (
        <button 
          onClick={() => setIsConfirmingDelete(true)} 
          className="text-[#5f5f5d] hover:text-red-400 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all mt-1 md:mt-0"
          title="Delete Tag"
        >
          <LucideIcons.X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return isEqual(prevProps.item, nextProps.item) &&
         prevProps.index === nextProps.index &&
         prevProps.totalItems === nextProps.totalItems &&
         prevProps.isMobile === nextProps.isMobile &&
         prevProps.snapshot.isDragging === nextProps.snapshot.isDragging &&
         prevProps.snapshot.isDropAnimating === nextProps.snapshot.isDropAnimating &&
         isEqual(prevProps.provided.draggableProps.style, nextProps.provided.draggableProps.style);
});

export default TagsBlockEditor;
