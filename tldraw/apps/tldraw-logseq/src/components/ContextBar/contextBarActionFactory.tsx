import { Decoration, isNonNullable, Color } from '@tldraw/core'
import { useApp } from '@tldraw/react'
import { observer } from 'mobx-react-lite'
import React from 'react'
import type {
  Shape,
  LogseqPortalShape,
  TextShape,
  HTMLShape,
  IFrameShape,
  YouTubeShape,
  BoxShape,
  PolygonShape,
  EllipseShape,
  LineShape,
  PencilShape,
} from '../../lib'
import { LogseqContext } from '../../lib/logseq-context'
import { TablerIcon } from '../icons'
import { ColorInput } from '../inputs/ColorInput'
import { type SelectOption, SelectInput } from '../inputs/SelectInput'
import { TextInput } from '../inputs/TextInput'
import {
  type ToggleGroupInputOption,
  ToggleGroupInput,
  ToggleGroupMultipleInput,
} from '../inputs/ToggleGroupInput'
import { ToggleInput } from '../inputs/ToggleInput'
import { Button } from '../Button'

export const contextBarActionTypes = [
  // Order matters
  'Edit',
  'AutoResizing',
  'Swatch',
  'NoFill',
  'StrokeType',
  'ScaleLevel',
  'TextStyle',
  'YoutubeLink',
  'IFrameSource',
  'LogseqPortalViewMode',
  'ArrowMode',
  'OpenPage',
] as const

type ContextBarActionType = typeof contextBarActionTypes[number]
const singleShapeActions: ContextBarActionType[] = [
  'Edit',
  'YoutubeLink',
  'IFrameSource',
  'OpenPage',
]

const contextBarActionMapping = new Map<ContextBarActionType, React.FC>()

type ShapeType = Shape['props']['type']

export const shapeMapping: Partial<Record<ShapeType, ContextBarActionType[]>> = {
  'logseq-portal': [
    'Swatch',
    'Edit',
    'LogseqPortalViewMode',
    'ScaleLevel',
    'OpenPage',
    'AutoResizing',
  ],
  youtube: ['YoutubeLink'],
  iframe: ['IFrameSource'],
  box: ['Swatch', 'NoFill', 'StrokeType'],
  ellipse: ['Swatch', 'NoFill', 'StrokeType'],
  polygon: ['Swatch', 'NoFill', 'StrokeType'],
  line: ['Edit', 'Swatch', 'ArrowMode'],
  pencil: ['Swatch'],
  highlighter: ['Swatch'],
  text: ['Edit', 'Swatch', 'ScaleLevel', 'AutoResizing', 'TextStyle'],
  html: ['ScaleLevel', 'AutoResizing'],
}

export const withFillShapes = Object.entries(shapeMapping)
  .filter(([key, types]) => {
    return types.includes('NoFill') && types.includes('Swatch')
  })
  .map(([key]) => key) as ShapeType[]

function filterShapeByAction<S extends Shape>(shapes: Shape[], type: ContextBarActionType): S[] {
  return shapes.filter(shape => shapeMapping[shape.props.type]?.includes(type)) as S[]
}

const EditAction = observer(() => {
  const app = useApp<Shape>()
  const shape = filterShapeByAction(app.selectedShapesArray, 'Edit')[0]

  return (
    <Button
      type="button"
      title="Edit"
      onClick={() => {
        app.api.editShape(shape)
        if (shape.props.type === 'logseq-portal') {
          let uuid = shape.props.pageId
          if (shape.props.blockType === 'P') {
            const firstNonePropertyBlock = window.logseq?.api
              ?.get_page_blocks_tree?.(shape.props.pageId)
              .find(b => !('propertiesOrder' in b))
            uuid = firstNonePropertyBlock.uuid
          }
          window.logseq?.api?.edit_block?.(uuid)
        }
      }}
    >
      <TablerIcon name="text" />
    </Button>
  )
})

const AutoResizingAction = observer(() => {
  const app = useApp<Shape>()
  const shapes = filterShapeByAction<LogseqPortalShape | TextShape | HTMLShape>(
    app.selectedShapesArray,
    'AutoResizing'
  )

  const pressed = shapes.every(s => s.props.isAutoResizing)

  return (
    <ToggleInput
      title="Auto Resize"
      toggle={shapes.every(s => s.props.type === 'logseq-portal')}
      className="tl-button"
      pressed={pressed}
      onPressedChange={v => {
        shapes.forEach(s => {
          if (s.props.type === 'logseq-portal') {
            s.update({
              isAutoResizing: v,
            })
          } else {
            s.onResetBounds({ zoom: app.viewport.camera.zoom })
          }
        })
        app.persist()
      }}
    >
      <TablerIcon name="dimensions" />
    </ToggleInput>
  )
})

const LogseqPortalViewModeAction = observer(() => {
  const app = useApp<Shape>()
  const shapes = filterShapeByAction<LogseqPortalShape>(
    app.selectedShapesArray,
    'LogseqPortalViewMode'
  )

  const collapsed = shapes.every(s => s.collapsed)
  const ViewModeOptions: ToggleGroupInputOption[] = [
    {
      value: '1',
      icon: 'object-compact',
    },
    {
      value: '0',
      icon: 'object-expanded',
    },
  ]
  return (
    <ToggleGroupInput
      title="View Mode"
      options={ViewModeOptions}
      value={collapsed ? '1' : '0'}
      onValueChange={v => {
        shapes.forEach(shape => {
          shape.setCollapsed(v === '1' ? true : false)
        })
        app.persist()
      }}
    />
  )
})

const ScaleLevelAction = observer(() => {
  const app = useApp<Shape>()
  const shapes = filterShapeByAction<LogseqPortalShape>(app.selectedShapesArray, 'ScaleLevel')
  const scaleLevel = new Set(shapes.map(s => s.scaleLevel)).size > 1 ? '' : shapes[0].scaleLevel
  const sizeOptions: SelectOption[] = [
    {
      label: 'Extra Small',
      value: 'xs',
    },
    {
      label: 'Small',
      value: 'sm',
    },
    {
      label: 'Medium',
      value: 'md',
    },
    {
      label: 'Large',
      value: 'lg',
    },
    {
      label: 'Extra Large',
      value: 'xl',
    },
    {
      label: 'Huge',
      value: 'xxl',
    },
  ]
  return (
    <SelectInput
      title="Scale Level"
      options={sizeOptions}
      value={scaleLevel}
      onValueChange={v => {
        shapes.forEach(shape => {
          shape.setScaleLevel(v as LogseqPortalShape['props']['scaleLevel'])
        })
        app.persist()
      }}
    />
  )
})

const OpenPageAction = observer(() => {
  const { handlers } = React.useContext(LogseqContext)
  const app = useApp<Shape>()
  const shapes = filterShapeByAction<LogseqPortalShape>(app.selectedShapesArray, 'OpenPage')
  const shape = shapes[0]
  const { pageId, blockType } = shape.props

  return (
    <span className="flex gap-1">
      <Button
        title="Open Page in Right Sidebar"
        type="button"
        onClick={() => handlers?.sidebarAddBlock(pageId, blockType === 'B' ? 'block' : 'page')}
      >
        <TablerIcon name="layout-sidebar-right" />
      </Button>
      <Button title="Open Page" type="button" onClick={() => handlers?.redirectToPage(pageId)}>
        <TablerIcon name="external-link" />
      </Button>
    </span>
  )
})

const IFrameSourceAction = observer(() => {
  const app = useApp<Shape>()
  const shape = filterShapeByAction<IFrameShape>(app.selectedShapesArray, 'IFrameSource')[0]

  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    shape.onIFrameSourceChange(e.target.value.trim().toLowerCase())
    app.persist()
  }, [])

  const handleReload = React.useCallback(() => {
    shape.reload()
  }, [])

  return (
    <span className="flex gap-3">
      <Button title="Reload" type="button" onClick={handleReload}>
        <TablerIcon name="refresh" />
      </Button>
      <TextInput
        title="Website Url"
        className="tl-iframe-src"
        value={`${shape.props.url}`}
        onChange={handleChange}
      />
      <Button title="Open website url" type="button" onClick={() => window.open(shape.props.url)}>
        <TablerIcon name="external-link" />
      </Button>
    </span>
  )
})

const YoutubeLinkAction = observer(() => {
  const app = useApp<Shape>()
  const shape = filterShapeByAction<YouTubeShape>(app.selectedShapesArray, 'YoutubeLink')[0]
  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    shape.onYoutubeLinkChange(e.target.value)
    app.persist()
  }, [])

  return (
    <span className="flex gap-3">
      <TextInput
        title="YouTube Link"
        className="tl-youtube-link"
        value={`${shape.props.url}`}
        onChange={handleChange}
      />
      <Button
        title="Open YouTube Link"
        type="button"
        onClick={() => window.logseq?.api?.open_external_link?.(shape.props.url)}
      >
        <TablerIcon name="external-link" />
      </Button>
    </span>
  )
})

const NoFillAction = observer(() => {
  const app = useApp<Shape>()
  const shapes = filterShapeByAction<BoxShape | PolygonShape | EllipseShape>(
    app.selectedShapesArray,
    'NoFill'
  )
  const handleChange = React.useCallback((v: boolean) => {
    shapes.forEach(s => s.update({ noFill: v }))
    app.persist()
  }, [])

  const noFill = shapes.every(s => s.props.noFill)

  return (
    <ToggleInput
      title="Fill Toggle"
      className="tl-button"
      pressed={noFill}
      onPressedChange={handleChange}
    >
      <TablerIcon name={noFill ? 'droplet-off' : 'droplet'} />
    </ToggleInput>
  )
})

const SwatchAction = observer(() => {
  const app = useApp<Shape>()
  // Placeholder
  const shapes = filterShapeByAction<
    BoxShape | PolygonShape | EllipseShape | LineShape | PencilShape | TextShape
  >(app.selectedShapesArray, 'Swatch')

  const handleSetColor = React.useCallback((color: string) => {
    shapes.forEach(s => {
      s.update({ fill: color, stroke: color })
    })
    app.persist()
  }, [])

  const handleSetOpacity = React.useCallback((opacity: number) => {
    shapes.forEach(s => {
      s.update({ opacity: opacity })
    })
    app.persist()
  }, [])

  const color = shapes[0].props.noFill ? shapes[0].props.stroke : shapes[0].props.fill
  return (
    <ColorInput
      title="Color Picker"
      popoverSide="top"
      color={color}
      opacity={shapes[0].props.opacity}
      collisionRef={document.getElementById('main-content-container')}
      setOpacity={handleSetOpacity}
      setColor={handleSetColor}
    />
  )
})

const StrokeTypeAction = observer(() => {
  const app = useApp<Shape>()
  const shapes = filterShapeByAction<
    BoxShape | PolygonShape | EllipseShape | LineShape | PencilShape
  >(app.selectedShapesArray, 'StrokeType')

  const StrokeTypeOptions: ToggleGroupInputOption[] = [
    {
      value: 'line',
      icon: 'circle',
    },
    {
      value: 'dashed',
      icon: 'circle-dashed',
    },
  ]

  const value = shapes.every(s => s.props.strokeType === 'dashed')
    ? 'dashed'
    : shapes.every(s => s.props.strokeType === 'line')
    ? 'line'
    : 'mixed'

  return (
    <ToggleGroupInput
      title="Stroke Type"
      options={StrokeTypeOptions}
      value={value}
      onValueChange={v => {
        shapes.forEach(shape => {
          shape.update({
            strokeType: v,
          })
        })
        app.persist()
      }}
    />
  )
})

const ArrowModeAction = observer(() => {
  const app = useApp<Shape>()
  const shapes = filterShapeByAction<LineShape>(app.selectedShapesArray, 'ArrowMode')

  const StrokeTypeOptions: ToggleGroupInputOption[] = [
    {
      value: 'start',
      icon: 'arrow-narrow-left',
    },
    {
      value: 'end',
      icon: 'arrow-narrow-right',
    },
  ]

  const startValue = shapes.every(s => s.props.decorations?.start === Decoration.Arrow)
  const endValue = shapes.every(s => s.props.decorations?.end === Decoration.Arrow)

  const value = [startValue ? 'start' : null, endValue ? 'end' : null].filter(isNonNullable)

  const valueToDecorations = (value: string[]) => {
    return {
      start: value.includes('start') ? Decoration.Arrow : null,
      end: value.includes('end') ? Decoration.Arrow : null,
    }
  }

  return (
    <ToggleGroupMultipleInput
      title="Arrow Head"
      options={StrokeTypeOptions}
      value={value}
      onValueChange={v => {
        shapes.forEach(shape => {
          shape.update({
            decorations: valueToDecorations(v),
          })
        })
        app.persist()
      }}
    />
  )
})

const TextStyleAction = observer(() => {
  const app = useApp<Shape>()
  const shapes = filterShapeByAction<TextShape>(app.selectedShapesArray, 'TextStyle')

  const bold = shapes.every(s => s.props.fontWeight > 500)
  const italic = shapes.every(s => s.props.italic)

  return (
    <span className="flex gap-1">
      <ToggleInput
        title="Bold"
        className="tl-button"
        pressed={bold}
        onPressedChange={v => {
          shapes.forEach(shape => {
            shape.update({
              fontWeight: v ? 700 : 400,
            })
            shape.onResetBounds()
          })
          app.persist()
        }}
      >
        <TablerIcon name="bold" />
      </ToggleInput>
      <ToggleInput
        title="Italic"
        className="tl-button"
        pressed={italic}
        onPressedChange={v => {
          shapes.forEach(shape => {
            shape.update({
              italic: v,
            })
            shape.onResetBounds()
          })
          app.persist()
        }}
      >
        <TablerIcon name="italic" />
      </ToggleInput>
    </span>
  )
})

contextBarActionMapping.set('Edit', EditAction)
contextBarActionMapping.set('AutoResizing', AutoResizingAction)
contextBarActionMapping.set('LogseqPortalViewMode', LogseqPortalViewModeAction)
contextBarActionMapping.set('ScaleLevel', ScaleLevelAction)
contextBarActionMapping.set('OpenPage', OpenPageAction)
contextBarActionMapping.set('YoutubeLink', YoutubeLinkAction)
contextBarActionMapping.set('IFrameSource', IFrameSourceAction)
contextBarActionMapping.set('NoFill', NoFillAction)
contextBarActionMapping.set('Swatch', SwatchAction)
contextBarActionMapping.set('StrokeType', StrokeTypeAction)
contextBarActionMapping.set('ArrowMode', ArrowModeAction)
contextBarActionMapping.set('TextStyle', TextStyleAction)

const getContextBarActionTypes = (type: ShapeType) => {
  return (shapeMapping[type] ?? []).filter(isNonNullable)
}

export const getContextBarActionsForTypes = (shapes: Shape[]) => {
  const types = shapes.map(s => s.props.type)
  const actionTypes = new Set(shapes.length > 0 ? getContextBarActionTypes(types[0]) : [])
  for (let i = 1; i < types.length && actionTypes.size > 0; i++) {
    const otherActionTypes = getContextBarActionTypes(types[i])
    actionTypes.forEach(action => {
      if (!otherActionTypes.includes(action)) {
        actionTypes.delete(action)
      }
    })
  }
  if (shapes.length > 1) {
    singleShapeActions.forEach(action => {
      if (actionTypes.has(action)) {
        actionTypes.delete(action)
      }
    })
  }

  return Array.from(actionTypes)
    .sort((a, b) => contextBarActionTypes.indexOf(a) - contextBarActionTypes.indexOf(b))
    .map(action => contextBarActionMapping.get(action)!)
}
