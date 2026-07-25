pipeline {
    agent any

    environment {
        APP_NAME = 'pixelmania'
        DOCKERFILE = 'Dockerfile'
        IMAGE_TAG = "${BUILD_NUMBER}"

        DOCKER_HOST = 'tcp://elated_robinson:2375'
        DOCKER_TLS_VERIFY = ''
        DOCKER_CERT_PATH = ''

        AWS_REGION = 'ap-south-1'
        AWS_ACCOUNT_ID = '209197638193'
        ECR_REPOSITORY = 'piximania'
        ECR_REGISTRY = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code...'
                checkout scm
            }
        }

        stage('Verify Environment') {
            steps {
                sh '''
                    set -e

                    node --version
                    npm --version
                    docker --version
                    docker info
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                    set -e
                    npm ci
                '''
            }
        }

        stage('Run Tests') {
            steps {
                sh '''
                    set -e
                    npx jest
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    set -e

                    docker build \
                        -f "${DOCKERFILE}" \
                        -t "${APP_NAME}:${IMAGE_TAG}" \
                        -t "${APP_NAME}:${GIT_COMMIT}" \
                        .
                '''
            }
        }

        stage('Install AWS CLI') {
            steps {
                sh '''
                    set -e

                    if command -v aws >/dev/null 2>&1; then
                        echo "AWS CLI is already installed globally"
                        aws --version

                    elif [ -x /tmp/aws-cli-bin/aws ]; then
                        echo "AWS CLI is already installed in /tmp"
                        /tmp/aws-cli-bin/aws --version

                    else
                        echo "Installing AWS CLI..."

                        if ! command -v curl >/dev/null 2>&1; then
                            echo "curl is not installed"
                            exit 1
                        fi

                        if ! command -v unzip >/dev/null 2>&1; then
                            echo "unzip is not installed"
                            exit 1
                        fi

                        curl -sSL \
                            "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" \
                            -o /tmp/awscliv2.zip

                        rm -rf /tmp/aws
                        rm -rf /tmp/aws-cli
                        rm -rf /tmp/aws-cli-bin

                        unzip -q -o /tmp/awscliv2.zip -d /tmp

                        /tmp/aws/install \
                            --install-dir /tmp/aws-cli \
                            --bin-dir /tmp/aws-cli-bin

                        /tmp/aws-cli-bin/aws --version
                    fi
                '''
            }
        }

        stage('Inspect Image') {
            steps {
                sh '''
                    set -e

                    docker image inspect "${APP_NAME}:${IMAGE_TAG}"
                '''
            }
        }

        stage('Push to ECR') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-ecr-credentials'
                ]]) {
                    sh '''
                        set -e

                        if command -v aws >/dev/null 2>&1; then
                            AWS_COMMAND="aws"

                        elif [ -x /tmp/aws-cli-bin/aws ]; then
                            AWS_COMMAND="/tmp/aws-cli-bin/aws"

                        else
                            echo "AWS CLI could not be found"
                            exit 1
                        fi

                        echo "Logging in to Amazon ECR..."

                        "${AWS_COMMAND}" ecr get-login-password \
                            --region "${AWS_REGION}" |
                        docker login \
                            --username AWS \
                            --password-stdin "${ECR_REGISTRY}"

                        BUILD_IMAGE="${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"
                        LATEST_IMAGE="${ECR_REGISTRY}/${ECR_REPOSITORY}:latest"

                        echo "Tagging Docker images..."

                        docker tag \
                            "${APP_NAME}:${IMAGE_TAG}" \
                            "${BUILD_IMAGE}"

                        docker tag \
                            "${APP_NAME}:${IMAGE_TAG}" \
                            "${LATEST_IMAGE}"

                        echo "Pushing build image..."

                        docker push "${BUILD_IMAGE}"

                        echo "Pushing latest image..."

                        docker push "${LATEST_IMAGE}"
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "Pipeline succeeded."
            echo "Built ${APP_NAME}:${IMAGE_TAG}"
            echo "Pushed ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"
            echo "Pushed ${ECR_REGISTRY}/${ECR_REPOSITORY}:latest"
        }

        failure {
            echo 'Pipeline failed. Check the failed stage logs.'
        }

        always {
            echo "Build ${BUILD_NUMBER} has completed."
        }
    }
}