import React from 'react';
import { A2UIComponent } from '../../types.js';
import {
  A2UIText,
  A2UITextField,
  A2UIChoicePicker,
  A2UIButton,
  A2UIAudioPlayer
} from './A2UIComponents.js';

interface A2UIRendererProps {
  key?: string | number;
  component: A2UIComponent | A2UIComponent[];
}

export function A2UIRenderer({ component }: A2UIRendererProps): React.JSX.Element {
  // If component is an array, render each item recursively
  if (Array.isArray(component)) {
    return (
      <>
        {component.map((comp) => (
          <A2UIRenderer key={comp.id} component={comp} />
        ))}
      </>
    );
  }

  const { type, text, usageHint, placeholder, label, bindPath, options, action, textToPronounce, children } = component;

  switch (type) {
    case 'Column':
      return (
        <div className="flex flex-col gap-4 w-full">
          {children && children.length > 0 && (
            <A2UIRenderer component={children} />
          )}
        </div>
      );

    case 'Row':
      return (
        <div className="flex flex-row flex-wrap gap-4 w-full">
          {children && children.length > 0 && (
            <A2UIRenderer component={children} />
          )}
        </div>
      );

    case 'Card':
      return (
        <div className="bg-white border border-slate-100 p-5 md:p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col gap-4 w-full border-t-4 border-t-indigo-500">
          {children && children.length > 0 && (
            <A2UIRenderer component={children} />
          )}
        </div>
      );

    case 'Text':
      return <A2UIText text={text || ""} usageHint={usageHint} />;

    case 'TextField':
      return <A2UITextField label={label} placeholder={placeholder} bindPath={bindPath} />;

    case 'ChoicePicker':
      return <A2UIChoicePicker label={label} options={options} bindPath={bindPath} />;

    case 'Button':
      return <A2UIButton text={text} action={action} />;

    case 'AudioPlayer':
      return <A2UIAudioPlayer textToPronounce={textToPronounce} />;

    default:
      console.warn(`Unsupported A2UI Component Type: ${type}`);
      return <div className="text-rose-500 text-xs">Unknown component type: {type}</div>;
  }
}
