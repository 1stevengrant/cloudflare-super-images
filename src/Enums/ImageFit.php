<?php

declare(strict_types=1);

namespace Ghijk\CloudflareSuperImages\Enums;

enum ImageFit: string
{
    case Cover = 'cover';
    case Contain = 'contain';
    case ScaleDown = 'scale-down';
    case Crop = 'crop';
    case Pad = 'pad';
}
