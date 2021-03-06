export function patchElProp(
    el: any,
    key: string,
    value: any,
    // the following args are passed only due to potential innerHTML/textContent
    // overriding existing VNodes, in which case the old tree must be properly
    // unmounted.
    prevChildren: any,
    parentComponent: any,
    parentSuspense: any,
    unmountChildren: any,
) {
    el[key] = value;
}
