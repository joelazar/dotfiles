#!/usr/bin/env python
# -*- coding: utf-8 -*-

import dracula.draw

# Load existing settings made via :set
config.load_autoconfig()

config.set('tabs.indicator.width', 0)

dracula.draw.blood(c, {
    'spacing': {
        'vertical': 6,
        'horizontal': 8
    }
})
