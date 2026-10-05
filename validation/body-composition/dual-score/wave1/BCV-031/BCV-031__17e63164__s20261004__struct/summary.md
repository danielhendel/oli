# BCV-031 — Intersectional structural fairness

Groups: 13; failing: 0. HARD FAIL: false.

| study | sex | levels | max abs delta | status consistent | pass |
|---|---|---|---|---|---|
| age_x_sex | male | 4 | 0 | true | true |
| height_x_sex | male | 3 | 0 | true | true |
| bmi_proxy_x_sex | male | 3 | 0 | true | true |
| athletic_x_sex | male | 3 | 0 | true | true |
| ethnicity_x_sex | male | 3 | 0 | true | true |
| vendor_x_site_x_sex | male | 4 | 0 | true | true |
| age_x_sex | female | 4 | 0 | true | true |
| height_x_sex | female | 3 | 0 | true | true |
| bmi_proxy_x_sex | female | 3 | 0 | true | true |
| athletic_x_sex | female | 3 | 0 | true | true |
| ethnicity_x_sex | female | 3 | 0 | true | true |
| vendor_x_site_x_sex | female | 4 | 0 | true | true |
| menopause_x_age | female | 12 | 0 | true | true |

Any non-invariance on an unused factor is a hidden-path dependence and a HARD FAIL.
