<?php

declare(strict_types=1);

arch()->expect('Ghijk\CloudflareSuperImages')
    ->not->toUse(['dd', 'dump', 'ray', 'var_dump']);

arch()->expect('Ghijk\CloudflareSuperImages\Enums')
    ->toBeEnums();

arch()->expect('Ghijk\CloudflareSuperImages\Exceptions')
    ->toExtend('Exception');
