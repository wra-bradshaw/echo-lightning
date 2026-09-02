import { Slider as SliderPrimitive } from '@base-ui/react/slider';

import { cn } from '@/shared/lib/cn';

type SliderProps = SliderPrimitive.Root.Props & {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-valuetext'?: string;
  getAriaLabel?: (index: number) => string;
  getAriaValueText?: (formattedValue: string, value: number, index: number) => string;
};

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-valuetext': ariaValueText,
  getAriaLabel,
  getAriaValueText,
  ...props
}: SliderProps) {
  const _values = Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max];

  return (
    <SliderPrimitive.Root
      className={cn('data-horizontal:w-full data-vertical:h-full', className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-full bg-white/20 select-none data-horizontal:h-1.5 data-horizontal:w-full data-vertical:h-full data-vertical:w-1.5"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-white select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            index={index}
            aria-label={getAriaLabel ? getAriaLabel(index) : ariaLabel}
            aria-labelledby={ariaLabelledBy}
            aria-valuetext={ariaValueText}
            getAriaLabel={getAriaLabel}
            getAriaValueText={getAriaValueText}
            className="relative block size-3.5 shrink-0 rounded-full border border-white/20 bg-white shadow-sm transition-[color,box-shadow] select-none after:absolute after:-inset-3 focus-within:ring-4 focus-within:ring-white focus-within:ring-offset-2 focus-within:ring-offset-zinc-950 focus-within:outline-none hover:ring-4 hover:ring-white/20 focus-visible:ring-4 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none active:ring-4 active:ring-white/20 disabled:pointer-events-none disabled:opacity-50 has-[input:focus-visible]:ring-4 has-[input:focus-visible]:ring-white has-[input:focus-visible]:ring-offset-2 has-[input:focus-visible]:ring-offset-zinc-950 has-[input:focus-visible]:outline-none"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
