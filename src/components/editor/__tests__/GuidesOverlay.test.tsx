import React from 'react';
import { render } from '@testing-library/react';
import { GuidesOverlay } from '../GuidesOverlay';

// Mock react-konva since it requires a real canvas environment
jest.mock('react-konva', () => {
  return {
    Group: 'Group',
    Line: 'Line',
  };
});

describe('GuidesOverlay', () => {
  it('renders nothing when there are no guides', () => {
    const { container } = render(<GuidesOverlay guides={[]} canvasWidth={1280} canvasHeight={720} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders correct lines for vertical and horizontal guides', () => {
    const guides = [
      { x1: 100, y1: 0, x2: 100, y2: 720 }, // Vertical
      { x1: 0, y1: 200, x2: 1280, y2: 200 }, // Horizontal
      { x1: 640, y1: 0, x2: 640, y2: 720 }, // Center Vertical
    ];
    
    const { container } = render(<GuidesOverlay guides={guides} canvasWidth={1280} canvasHeight={720} />);
    expect(container).toMatchSnapshot();
  });
});
