import { describe, expect, it } from 'vitest'
import {
  createConfirmDialogState,
  createDeleteBookmarkConfirmation,
  createDeleteCategoryConfirmation,
  createImportOverwriteConfirmation,
} from '../../src/lib/appConfirmDialog'

describe('app confirmation dialog helpers', () => {
  it('applies default confirmation dialog fields', () => {
    expect(createConfirmDialogState({
      title: '确认操作',
      message: '是否继续？',
    })).toEqual({
      title: '确认操作',
      message: '是否继续？',
      itemTitle: '',
      confirmLabel: '确认',
      cancelLabel: '取消',
      variant: 'default',
    })
  })

  it('builds category deletion confirmations', () => {
    expect(createConfirmDialogState(createDeleteCategoryConfirmation('工具'))).toEqual({
      title: '删除分类',
      message: '删除后该分类及其下所有书签都会从首页和后台列表中移除，此操作不可撤销。',
      itemTitle: '工具',
      confirmLabel: '确认删除',
      cancelLabel: '取消',
      variant: 'danger',
    })
  })

  it('builds bookmark deletion confirmations', () => {
    expect(createConfirmDialogState(createDeleteBookmarkConfirmation('GitHub'))).toEqual({
      title: '删除书签',
      message: '删除后该书签会从首页和后台列表中移除，此操作不可撤销。',
      itemTitle: 'GitHub',
      confirmLabel: '确认删除',
      cancelLabel: '取消',
      variant: 'danger',
    })
  })

  it('builds import overwrite confirmations', () => {
    expect(createConfirmDialogState(createImportOverwriteConfirmation({
      sourceLabel: 'SunPanel',
      categories: 2,
      bookmarks: 12,
    }))).toEqual({
      title: '导入并覆盖数据',
      message: '导入 SunPanel 将覆盖现有的全部分类与书签（2 个分类，12 个书签），此操作不可撤销。',
      itemTitle: '',
      confirmLabel: '确认导入',
      cancelLabel: '取消',
      variant: 'danger',
    })
  })
})
