import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import stylisticJs from '@stylistic/eslint-plugin';

export default tseslint.config(
    ...pluginVue.configs['flat/strongly-recommended'],
    // TypeScript support for .ts files
    {
        files: ['**/*.ts'],
        extends: tseslint.configs.recommended,
    },
    // TypeScript parser for script blocks in .vue files
    {
        files: ['**/*.vue'],
        languageOptions: {
            parserOptions: {
                parser: tseslint.parser,
            },
        },
    },
    {
        plugins: {
            '@stylistic/js': stylisticJs,
        },
        rules: {
            // Vue template formatting - project uses 4-space indentation
            'vue/html-indent': ['warn', 4],
            'vue/max-attributes-per-line': 'off',
            'vue/singleline-html-element-content-newline': 'off',
            'vue/multiline-html-element-content-newline': 'off',
            'vue/html-self-closing': 'off',
            'vue/html-closing-bracket-spacing': 'off',
            'vue/no-spaces-around-equal-signs-in-attribute': 'off',

            // Vue naming - project uses camelCase props and single-word component names
            'vue/attribute-hyphenation': 'off',
            'vue/v-on-event-hyphenation': 'off',
            'vue/multi-word-component-names': 'off',

            // TypeScript - project makes intentional use of any and {} types
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-empty-object-type': 'off',

            '@stylistic/js/comma-dangle': ['error', {
                'arrays': 'always-multiline',
                'objects': 'always-multiline',
                'functions': 'always-multiline',
            }],
        },
    },
);
