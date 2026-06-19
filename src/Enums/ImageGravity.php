<?php

declare(strict_types=1);

namespace Ghijk\CloudflareSuperImages\Enums;

enum ImageGravity: string
{
    case Auto = 'auto';
    case Face = 'face';
    case Left = 'left';
    case Right = 'right';
    case Top = 'top';
    case Bottom = 'bottom';
}
